/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import Collection from "./collection";
import { getId } from "../utils/id";
import { getContentFromData } from "../content-types";
import { hasItem } from "../utils/array";
import { getOutputType } from "./attachments";

export default class Content extends Collection {
  async add(content) {
    if (!content) return;

    if (content.remote)
      throw new Error(
        "Please do not use this method for merging. Instead add the item directly to database."
      );
    if (content.deleted) return await this._collection.addItem(content);

    if (typeof content.data === "object") {
      if (typeof content.data.data === "string")
        content.data = content.data.data;
      else if (!content.data.iv && !content.data.cipher)
        content.data = `<p>Content is invalid: ${JSON.stringify(
          content.data
        )}</p>`;
    }

    const oldContent = await this.raw(content.id);
    if (content.id && oldContent) {
      content = {
        ...oldContent,
        ...content,
        dateEdited: content.dateEdited || Date.now()
      };
    }

    const id = content.id || getId();

    const contentItem = await this.extractAttachments({
      noteId: content.noteId,
      id,
      type: content.type,
      data: content.data || content,
      dateEdited: content.dateEdited,
      dateCreated: content.dateCreated,
      dateModified: content.dateModified,
      localOnly: !!content.localOnly,
      conflicted: content.conflicted,
      dateResolved: content.dateResolved
    });
    await this._collection.addItem(contentItem);

    if (content.sessionId) {
      await this._db.noteHistory.add(contentItem.noteId, content.sessionId, {
        data: contentItem.data,
        type: contentItem.type
      });
    }
    return id;
  }

  async get(id) {
    const content = await this.raw(id);
    if (!content) return;
    return content.data;
  }

  async raw(id) {
    if (!id) return;

    const content = await this._collection.getItem(id);
    if (!content) return;
    return content;
  }

  remove(id) {
    if (!id) return;
    return this._collection.removeItem(id);
  }

  multi(ids) {
    return this._collection.getItems(ids);
  }

  exists(id) {
    return this._collection.exists(id);
  }

  async all() {
    return Object.values(
      await this._collection.getItems(this._collection.indexer.indices)
    );
  }

  insertMedia(contentItem) {
    return this._insert(contentItem, this._db.attachments.read);
  }

  insertPlaceholders(contentItem, placeholder) {
    return this._insert(contentItem, () => placeholder);
  }

  async downloadMedia(groupId, contentItem, notify = true) {
    if (!contentItem) return contentItem;
    const content = getContentFromData(contentItem.type, contentItem.data);
    if (!content) console.log(contentItem);
    contentItem.data = await content.insertMedia(async (hashes) => {
      const attachments = hashes
        .map((h) => this._db.attachments.attachment(h))
        .filter((a) => !!a && !!a.metadata);
      await this._db.fs.queueDownloads(
        attachments.map((a) => ({
          filename: a.metadata.hash,
          metadata: a.metadata,
          chunkSize: a.chunkSize
        })),
        groupId,
        notify ? { readOnDownload: false } : undefined
      );
      const sources = {};
      for (const attachment of attachments) {
        if (!attachment.metadata) continue;

        const src = await this._db.attachments.read(
          attachment.metadata.hash,
          getOutputType(attachment)
        );
        if (!src) continue;
        sources[attachment.metadata.hash] = src;
      }
      return sources;
    });
    return contentItem;
  }

  async _insert(contentItem, getData) {
    if (!contentItem || !getData) return;
    const content = getContentFromData(contentItem.type, contentItem.data);
    contentItem.data = await content.insertMedia(getData);
    return contentItem;
  }

  /**
   *
   * @param {string} id
   * @param {string[]} hashes
   * @returns {Promise<any>}
   */
  async removeAttachments(id, hashes) {
    const contentItem = await this.raw(id);
    const content = getContentFromData(contentItem.type, contentItem.data);
    contentItem.data = content.removeAttachments(hashes);
    await this.add(contentItem);
  }

  /**
   *
   * @param {any} contentItem
   * @returns {Promise<any>}
   */
  async extractAttachments(contentItem) {
    if (contentItem.localOnly || typeof contentItem.data !== "string")
      return contentItem;

    const allAttachments = this._db.attachments.all;
    const content = getContentFromData(contentItem.type, contentItem.data);
    if (!content) return contentItem;
    const { data, attachments } = await content.extractAttachments(
      (data, type, mimeType) => this._db.attachments.save(data, type, mimeType)
    );

    const noteAttachments = allAttachments.filter((attachment) =>
      hasItem(attachment.noteIds, contentItem.noteId)
    );

    const toDelete = noteAttachments.filter((attachment) => {
      return attachments.every(
        (a) => a && a.hash && a.hash !== attachment.metadata?.hash
      );
    });

    const toAdd = attachments.filter((attachment) => {
      return (
        attachment &&
        attachment.hash &&
        noteAttachments.every((a) => attachment.hash !== a.metadata?.hash)
      );
    });

    for (let attachment of toDelete) {
      if (!attachment.metadata) continue;

      await this._db.attachments.delete(
        attachment.metadata?.hash,
        contentItem.noteId
      );
    }

    for (let attachment of toAdd) {
      await this._db.attachments.add(attachment, contentItem.noteId);
    }

    if (toAdd.length > 0) {
      contentItem.dateModified = Date.now();
    }
    contentItem.data = data;
    return contentItem;
  }

  async cleanup() {
    const indices = this._collection.indexer.indices;
    await this._db.notes.init();
    const notes = this._db.notes._collection.getRaw();
    if (!notes.length && indices.length > 0) return [];
    let ids = [];
    for (let contentId of indices) {
      const noteIndex = notes.findIndex((note) => note.contentId === contentId);
      const isOrphaned = noteIndex === -1;
      if (isOrphaned) {
        ids.push(contentId);
        await this._collection.deleteItem(contentId);
      } else if (notes[noteIndex].localOnly) {
        ids.push(contentId);
      }
    }
    return ids;
  }
}
