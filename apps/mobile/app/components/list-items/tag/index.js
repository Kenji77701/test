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

import React from "react";
import { View } from "react-native";
import { notesnook } from "../../../../e2e/test.ids";
import { TaggedNotes } from "../../../screens/notes/tagged";
import { useThemeColors } from "@notesnook/theme";
import { SIZE } from "../../../utils/size";
import { Properties } from "../../properties";
import { IconButton } from "../../ui/icon-button";
import { PressableButton } from "../../ui/pressable";
import Heading from "../../ui/typography/heading";
import Paragraph from "../../ui/typography/paragraph";

const TagItem = React.memo(
  ({ item, index }) => {
    const { colors, isDark } = useThemeColors();
    const onPress = () => {
      TaggedNotes.navigate(item, true);
    };

    return (
      <PressableButton
        onPress={onPress}
        selectedColor={colors.secondary.background}
        testID={notesnook.ids.tag.get(index)}
        alpha={!isDark ? -0.02 : 0.02}
        opacity={1}
        customStyle={{
          paddingHorizontal: 12,
          flexDirection: "row",
          paddingVertical: 12,
          alignItems: "center",
          width: "100%",
          justifyContent: "space-between"
        }}
      >
        <View
          style={{
            maxWidth: "92%"
          }}
        >
          <Heading size={SIZE.md}>
            <Heading
              size={SIZE.md}
              style={{
                color: colors.primary.accent
              }}
            >
              #
            </Heading>
            {item.title}
          </Heading>
          <Paragraph
            color={colors.secondary.paragraph}
            size={SIZE.xs}
            style={{
              marginTop: 5
            }}
          >
            {item && item.noteIds.length && item.noteIds.length > 1
              ? item.noteIds.length + " notes"
              : item.noteIds.length === 1
              ? item.noteIds.length + " note"
              : null}
          </Paragraph>
        </View>

        <IconButton
          color={colors.primary.heading}
          name="dots-horizontal"
          size={SIZE.xl}
          onPress={() => {
            Properties.present(item);
          }}
          testID={notesnook.ids.tag.menu}
          customStyle={{
            justifyContent: "center",
            height: 35,
            width: 35,
            borderRadius: 100,
            alignItems: "center"
          }}
        />
      </PressableButton>
    );
  },
  (prev, next) => {
    if (prev.item?.dateEdited !== next.item?.dateEdited) {
      return false;
    }
    if (JSON.stringify(prev.item) !== JSON.stringify(next.item)) {
      return false;
    }

    return true;
  }
);

TagItem.displayName = "TagItem";

export default TagItem;
