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
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Linking, Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import Commands from "../app/screens/editor/tiptap/commands";
import {
  eSubscribeEvent,
  eUnSubscribeEvent
} from "../app/services/event-manager";
import { eOnLoadNote } from "../app/utils/events";
import { useShareStore } from "./store";

const EditorMobileSourceUrl =
  Platform.OS === "android"
    ? "file:///android_asset/plaineditor.html"
    : "extension.bundle/plaineditor.html";
/**
 * Replace this with dev url when debugging or working on the editor mobile repo.
 * The url should be something like this: http://192.168.100.126:3000/index.html
 */
export const EDITOR_URI = __DEV__
  ? EditorMobileSourceUrl
  : EditorMobileSourceUrl;

export async function post(ref, type, value = null) {
  const message = {
    type,
    value
  };
  setImmediate(() => ref.current?.postMessage(JSON.stringify(message)));
}

const useEditor = () => {
  const ref = useRef();
  const colors = useShareStore((state) => state.colors);
  const accent = useShareStore((state) => state.accent);
  const commands = useMemo(() => new Commands(ref), [ref]);
  const currentNote = useRef();

  const postMessage = useCallback(
    async (type, data) => post(ref, type, data),
    []
  );

  const loadNote = useCallback(
    (note) => {
      postMessage("html", note.content.data);
      currentNote.current = note;
    },
    [postMessage]
  );

  useEffect(() => {
    eSubscribeEvent(eOnLoadNote + "shareEditor", loadNote);
    return () => {
      eUnSubscribeEvent(eOnLoadNote + "shareEditor", loadNote);
    };
  }, [loadNote]);

  const onLoad = () => {
    setTimeout(() => {
      postMessage(
        "theme",
        `
          body * {
            color: ${colors.pri};
          }
  
          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            color: ${colors.heading};
          }
  
          a {
            color: ${accent};
          }
        `
      );
    }, 300);
  };

  return { ref, onLoad, currentNote, commands };
};

const useEditorEvents = (editor, onChange) => {
  const onMessage = (event) => {
    const data = event.nativeEvent.data;
    const editorMessage = JSON.parse(data);

    switch (editorMessage.type) {
      case "content":
        console.log("[WEBVIEW LOG]", "EditorTypes.content");
        onChange(editorMessage.value);
        break;
    }
  };
  return onMessage;
};

const onShouldStartLoadWithRequest = (request) => {
  if (request.url.includes("https")) {
    if (Platform.OS === "ios" && !request.isTopFrame) return true;
    Linking.openURL(request.url);
    return false;
  } else {
    return true;
  }
};

const style = {
  height: "100%",
  maxHeight: "100%",
  width: "100%",
  alignSelf: "center",
  backgroundColor: "transparent"
};

export const Editor = ({ onChange, onLoad }) => {
  const colors = useShareStore((state) => state.colors);
  const editor = useEditor();
  const onMessage = useEditorEvents(editor, onChange);
  const [loading, setLoading] = useState(true);
  useLayoutEffect(() => {
    onLoad?.();
  }, [onLoad]);

  useEffect(() => {
    setTimeout(() => {
      onLoad?.();
      setTimeout(() => setLoading(false));
    }, 1000);
  }, [onLoad]);

  return (
    <View
      style={{
        flex: 1
      }}
    >
      <WebView
        ref={editor.ref}
        onLoad={editor.onLoad}
        nestedScrollEnabled
        javaScriptEnabled={true}
        focusable={true}
        setSupportMultipleWindows={false}
        overScrollMode="never"
        scrollEnabled={false}
        keyboardDisplayRequiresUserAction={false}
        cacheMode="LOAD_DEFAULT"
        cacheEnabled={true}
        domStorageEnabled={true}
        bounces={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        allowFileAccess={true}
        scalesPageToFit={true}
        hideKeyboardAccessoryView={false}
        allowsFullscreenVideo={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        originWhitelist={["*"]}
        source={{
          uri: EDITOR_URI
        }}
        style={style}
        autoManageStatusBarEnabled={false}
        onMessage={onMessage || undefined}
      />
      {loading ? (
        <View
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backgroundColor: colors.bg,
            alignItems: "flex-start",
            zIndex: 999,
            paddingHorizontal: 12
          }}
        >
          <View
            style={{
              height: 16,
              width: "100%",
              backgroundColor: colors.nav,
              borderRadius: 5,
              marginTop: 10
            }}
          />

          <View
            style={{
              height: 16,
              width: "100%",
              backgroundColor: colors.nav,
              borderRadius: 5,
              marginTop: 10
            }}
          />

          <View
            style={{
              height: 16,
              width: "60%",
              backgroundColor: colors.nav,
              borderRadius: 5,
              marginTop: 10
            }}
          />
        </View>
      ) : null}
    </View>
  );
};
