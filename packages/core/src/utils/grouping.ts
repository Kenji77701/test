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

import { isReminderActive } from "../collections/reminders";
import { GroupHeader, GroupOptions, ItemType, Reminder } from "../types";
import { getWeekGroupFromTimestamp, MONTHS_FULL } from "./date";

type PartialGroupableItem = {
  id: string;
  type?: ItemType | null;
  dateDeleted?: number | null;
  title?: string | null;
  filename?: string | null;
  dateEdited?: number | null;
  dateCreated?: number | null;
};
type EvaluateKeyFunction<T> = (item: T) => string;

export const getSortValue = (
  options: GroupOptions,
  item: PartialGroupableItem
) => {
  if (
    options.sortBy === "dateDeleted" &&
    "dateDeleted" in item &&
    item.dateDeleted
  )
    return item.dateDeleted;
  else if (options.sortBy === "dateEdited" && "dateEdited" in item)
    return item.dateEdited;

  return item.dateCreated;
};

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const MILLISECONDS_IN_WEEK = MILLISECONDS_IN_DAY * 7;

function getKeySelector(
  options: GroupOptions
): EvaluateKeyFunction<PartialGroupableItem> {
  return (item) => {
    if ("pinned" in item && item.pinned) return "Pinned";
    else if ("conflicted" in item && item.conflicted) return "Conflicted";

    const date = new Date();
    if (item.type === "reminder")
      return isReminderActive(item as Reminder) ? "Active" : "Inactive";
    else if (options.sortBy === "title")
      return getFirstCharacter(getTitle(item));
    else {
      const value = getSortValue(options, item) || 0;
      switch (options.groupBy) {
        case "none":
          return "All";
        case "month":
          date.setTime(value);
          return `${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`;
        case "week":
          return getWeekGroupFromTimestamp(value);
        case "year":
          date.setTime(value);
          return date.getFullYear().toString();
        case "default":
        default: {
          return value > date.getTime() - MILLISECONDS_IN_WEEK
            ? "Recent"
            : value > date.getTime() - MILLISECONDS_IN_WEEK * 2
            ? "Last week"
            : "Older";
        }
      }
    }
  };
}

export function groupArray(
  items: PartialGroupableItem[],
  options: GroupOptions = {
    groupBy: "default",
    sortBy: "dateEdited",
    sortDirection: "desc"
  }
): (string | GroupHeader)[] {
  const groups = new Map<string, string[]>([
    ["Conflicted", []],
    ["Pinned", []]
  ]);

  const keySelector = getKeySelector(options);
  for (const item of items) {
    const groupTitle = keySelector(item);
    const group = groups.get(groupTitle) || [];
    group.push(item.id);
    groups.set(groupTitle, group);
  }

  return flattenGroups(groups);
}

function flattenGroups(groups: Map<string, string[]>) {
  const items: (string | GroupHeader)[] = [];
  groups.forEach((groupItems, groupTitle) => {
    if (groupItems.length <= 0) return;
    items.push({
      title: groupTitle,
      id: groupTitle.toLowerCase(),
      type: "header"
    });
    items.push(...groupItems);
  });

  return items;
}

function getFirstCharacter(str: string) {
  if (!str) return "-";
  str = str.trim();
  if (str.length <= 0) return "-";
  return str[0].toUpperCase();
}

function getTitle(item: PartialGroupableItem): string {
  return item.filename || item.title || "Unknown";
}
