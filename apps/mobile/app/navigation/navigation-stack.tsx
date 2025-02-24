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

import { strings } from "@notesnook/intl";
import { useThemeColors } from "@notesnook/theme";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as React from "react";
import AppLockedScreen from "../components/app-lock-overlay";
import Auth from "../components/auth";
import Intro from "../components/intro";
import { hideAllTooltips } from "../hooks/use-tooltip";
import Favorites from "../screens/favorites";
import Home from "../screens/home";
import NotebookScreen from "../screens/notebook";
import { ColoredNotes } from "../screens/notes/colored";
import { Monographs } from "../screens/notes/monographs";
import { TaggedNotes } from "../screens/notes/tagged";
import Reminders from "../screens/reminders";
import { Search } from "../screens/search";
import Settings from "../screens/settings";
import Trash from "../screens/trash";
import SettingsService from "../services/settings";
import useNavigationStore, {
  RouteParams
} from "../stores/use-navigation-store";
import { useSelectionStore } from "../stores/use-selection-store";
import { useSettingStore } from "../stores/use-setting-store";
import { fluidTabsRef, rootNavigatorRef } from "../utils/global-refs";
import { FluidPanelsView } from "./fluid-panels-view";
import LinkNotebooks from "../screens/link-notebooks";
import { MoveNotebook } from "../screens/move-notebook";
import { MoveNotes } from "../screens/move-notes";

const RootStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

const AppNavigation = React.memo(
  () => {
    const { colors } = useThemeColors();
    const homepage = SettingsService.get().homepage;
    React.useEffect(() => {
      setTimeout(() => {
        useNavigationStore.getState().update(homepage as keyof RouteParams);
      }, 1000);
    }, [homepage]);

    return (
      <AppStack.Navigator
        initialRouteName={homepage}
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: {
            backgroundColor: colors.primary.background
          }
        }}
      >
        <AppStack.Screen name="Notes" component={Home as any} />
        <AppStack.Screen name="Favorites" component={Favorites as any} />
        <AppStack.Screen name="Trash" component={Trash as any} />
        <AppStack.Screen name="TaggedNotes" component={TaggedNotes as any} />
        <AppStack.Screen name="ColoredNotes" component={ColoredNotes as any} />
        <AppStack.Screen name="Reminders" component={Reminders as any} />
        <AppStack.Screen
          name="Monographs"
          initialParams={{
            item: { type: "monograph" },
            canGoBack: false,
            title: strings.monographs()
          }}
          component={Monographs as any}
        />
        <AppStack.Screen name="Notebook" component={NotebookScreen as any} />
        <AppStack.Screen name="Search" component={Search as any} />
      </AppStack.Navigator>
    );
  },
  () => true
);
AppNavigation.displayName = "AppNavigation";

export const RootNavigation = () => {
  const introCompleted = useSettingStore(
    (state) => state.settings.introCompleted
  );
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const onStateChange = React.useCallback(() => {
    if (useSelectionStore.getState().selectionMode) {
      clearSelection();
    }
    hideAllTooltips();
  }, [clearSelection]);

  return (
    <NavigationContainer onStateChange={onStateChange} ref={rootNavigatorRef}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false
        }}
        screenListeners={{
          focus: (props) => {
            if (props.target?.startsWith("FluidPanelsView")) {
              fluidTabsRef.current?.unlock();
            } else {
              fluidTabsRef.current?.lock();
            }
          }
        }}
        initialRouteName={introCompleted ? "FluidPanelsView" : "Welcome"}
      >
        <RootStack.Screen name="Welcome" component={Intro as any} />
        <RootStack.Screen name="Auth" component={Auth as any} />
        <RootStack.Screen name="FluidPanelsView" component={FluidPanelsView} />
        <RootStack.Screen name="AppLock" component={AppLockedScreen} />
        <RootStack.Screen
          name="LinkNotebooks"
          component={LinkNotebooks as any}
        />
        <RootStack.Screen name="MoveNotebook" component={MoveNotebook as any} />
        <RootStack.Screen name="MoveNotes" component={MoveNotes as any} />
        <AppStack.Screen name="Settings" component={Settings} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export const AppNavigationStack = React.memo(
  () => {
    return <AppNavigation />;
  },
  () => true
);
AppNavigationStack.displayName = "AppNavigationStack";
