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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, Image, Text } from "@theme-ui/components";
import {
  Note,
  Notebook as NotebookIcon,
  StarOutline,
  Monographs,
  Tag as TagIcon,
  Trash,
  Settings,
  Notebook2,
  Tag2,
  Topic,
  DarkMode,
  LightMode,
  Login,
  Circle,
  Icon,
  Reminders,
  User,
  Home,
  Pro,
  Documentation,
  Logout
} from "../icons";
import NavigationItem, { SortableNavigationItem } from "./navigation-item";
import { hardNavigate, hashNavigate, navigate } from "../../navigation";
import { db } from "../../common/db";
import useMobile from "../../hooks/use-mobile";
import { useStore as useAppStore } from "../../stores/app-store";
import { useStore as useUserStore } from "../../stores/user-store";
import { useStore as useThemeStore } from "../../stores/theme-store";
import { useStore as useSettingStore } from "../../stores/setting-store";
import useLocation from "../../hooks/use-location";
import { FlexScrollContainer } from "../scroll-container";
import { ScopedThemeProvider } from "../theme-provider";
import {
  closestCenter,
  DndContext,
  useSensor,
  useSensors,
  KeyboardSensor,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { usePersistentState } from "../../hooks/use-persistent-state";
import { MenuItem } from "@notesnook/ui";
import { Notebook, Tag } from "@notesnook/core";
import { handleDrop } from "../../common/drop-handler";
import { Menu } from "../../hooks/use-menu";
import { RenameColorDialog } from "../../dialogs/item-dialog";
import { strings } from "@notesnook/intl";
import Tags from "../../views/tags";
import NotebookTree from "./notebook-tree";
import { UserProfile } from "../../dialogs/settings/components/user-profile";
import { SUBSCRIPTION_STATUS } from "../../common/constants";
import { ConfirmDialog, showLogoutConfirmation } from "../../dialogs/confirm";
import { CREATE_BUTTON_MAP, createBackup } from "../../common";
import { TaskManager } from "../../common/task-manager";
import { showToast } from "../../utils/toast";
import { useStore } from "../../stores/note-store";
import { TabItem } from "./tab-item";

type Route = {
  id: string;
  title: string;
  path: string;
  icon: Icon;
  tag?: string;
  count?: number;
};

function shouldSelectNavItem(route: string, pin: Notebook | Tag) {
  return route.endsWith(pin.id);
}

const routesInit: Route[] = [
  { id: "notes", title: strings.routes.Notes(), path: "/notes", icon: Note },
  {
    id: "favorites",
    title: strings.routes.Favorites(),
    path: "/favorites",
    icon: StarOutline
  },
  {
    id: "reminders",
    title: strings.routes.Reminders(),
    path: "/reminders",
    icon: Reminders
  },
  {
    id: "monographs",
    title: strings.routes.Monographs(),
    path: "/monographs",
    icon: Monographs
  },
  { id: "trash", title: strings.routes.Trash(), path: "/trash", icon: Trash }
];

const tabs = [
  {
    id: "home",
    icon: Home,
    title: strings.routes.Home()
  },
  {
    id: "notebook",
    icon: NotebookIcon,
    title: strings.routes.Notebooks()
  },
  { id: "tag", icon: TagIcon, title: strings.routes.Tags() }
] as const;

const settings = {
  id: "settings",
  title: strings.routes.Settings(),
  path: "/settings",
  icon: Settings
} as const;

type NavigationMenuProps = {
  toggleNavigationContainer: (toggleState?: boolean) => void;
  isTablet: boolean;
};

function NavigationMenu(props: NavigationMenuProps) {
  const { toggleNavigationContainer, isTablet } = props;
  const [routes, setRoutes] = useState(routesInit);
  const [location] = useLocation();
  const isFocusMode = useAppStore((store) => store.isFocusMode);
  const colors = useAppStore((store) => store.colors);
  const shortcuts = useAppStore((store) => store.shortcuts);
  const refreshNavItems = useAppStore((store) => store.refreshNavItems);
  const isMobile = useMobile();
  const [hiddenRoutes, setHiddenRoutes] = usePersistentState(
    "sidebarHiddenItems:routes",
    db.settings.getSideBarHiddenItems("routes")
  );
  const [hiddenColors, setHiddenColors] = usePersistentState(
    "sidebarHiddenItems:colors",
    db.settings.getSideBarHiddenItems("colors")
  );
  const [currentTab, setCurrentTab] = useState<(typeof tabs)[number]["id"]>(
    tabs.find((tab) => location.includes(tab.id))?.id || "home"
  );
  const notes = useStore((store) => store.notes);

  useEffect(() => {
    const setCounts = async () => {
      const totalNotes = await db.notes.all.count();
      const totalFavorites = await db.notes.favorites.count();
      const totalReminders = await db.reminders.all.count();
      const totalTrash = (await db.trash.all()).length;
      const totalMonographs = await db.monographs.all.count();

      setRoutes((routes) => {
        return routes.map((route) => {
          switch (route.id) {
            case "notes":
              return { ...route, count: totalNotes };
            case "favorites":
              return { ...route, count: totalFavorites };
            case "reminders":
              return { ...route, count: totalReminders };
            case "trash":
              return { ...route, count: totalTrash };
            case "monographs":
              return { ...route, count: totalMonographs };
            default:
              return route;
          }
        });
      });
    };

    setCounts();
  }, [notes]);

  const dragTimeout = useRef(0);

  const _navigate = useCallback(
    (path: string) => {
      toggleNavigationContainer(true);
      navigate(path);
    },
    [location, toggleNavigationContainer]
  );

  const getSidebarItems = useCallback(async () => {
    return [
      {
        key: "reset-sidebar",
        type: "button",
        title: strings.resetSidebar(),
        onClick: () => {
          db.settings
            .setSideBarHiddenItems("routes", [])
            .then(() => db.settings.setSideBarHiddenItems("colors", []))
            .then(() => db.settings.setSideBarOrder("colors", []))
            .then(() => db.settings.setSideBarOrder("routes", []))
            .then(() => db.settings.setSideBarOrder("shortcuts", []))
            .then(() => {
              setHiddenRoutes([]);
              setHiddenColors([]);
            });
        }
      },
      { type: "separator", key: "sep" },
      ...toMenuItems(
        orderItems(routes, db.settings.getSideBarOrder("routes")),
        hiddenRoutes,
        (ids) =>
          db.settings
            .setSideBarHiddenItems("routes", ids)
            .then(() => setHiddenRoutes(ids))
      ),
      { type: "separator", key: "sep", isHidden: colors.length <= 0 },
      ...toMenuItems(
        orderItems(colors, db.settings.getSideBarOrder("colors")),
        hiddenColors,
        (ids) =>
          db.settings
            .setSideBarHiddenItems("colors", ids)
            .then(() => setHiddenColors(ids))
      )
    ] as MenuItem[];
  }, [colors, hiddenColors, hiddenRoutes]);

  return (
    <ScopedThemeProvider
      scope="navigationMenu"
      sx={{
        display: "flex",
        zIndex: 1,
        position: "relative",
        flex: 1,
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        bg: "background",
        borderRight: "1px solid var(--separator)"
      }}
    >
      <Flex
        sx={{
          flexDirection: isTablet ? "column" : "row",
          alignItems: "center",
          justifyContent: isTablet ? "center" : "space-between"
        }}
      >
        <Flex
          sx={{
            flexDirection: isTablet ? "column" : "row",
            alignItems: "center",
            padding: 20,
            gap: 2
          }}
        >
          <svg
            style={{
              width: isTablet ? 20 : isMobile ? 30 : 30,
              height: isTablet ? 20 : isMobile ? 30 : 30
            }}
          >
            <use href="#full-logo" />
          </svg>
          <Text
            variant="heading"
            sx={{
              fontSize: 16,
              display: isTablet ? "none" : "block"
            }}
          >
            <b>Notesnook</b>
          </Text>
        </Flex>
        <NavigationDropdown
          toggleNavigationContainer={toggleNavigationContainer}
        />
      </Flex>
      <Flex
        sx={{
          flexDirection: isTablet ? "column" : "row",
          justifyContent: "center"
        }}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            id={tab.id}
            title={tab.title}
            icon={tab.icon}
            selected={currentTab === tab.id}
            onClick={() => setCurrentTab(tab.id)}
          />
        ))}
      </Flex>
      {isTablet && (
        <Box
          bg="separator"
          my={1}
          sx={{ width: "85%", height: "0.8px", alignSelf: "center" }}
        />
      )}
      <Flex
        id="navigation-menu"
        data-test-id="navigation-menu"
        sx={{
          display: isFocusMode ? "none" : "flex",
          flex: 1,
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingLeft: isTablet ? 0 : 20,
          paddingRight: isTablet ? 0 : 20
        }}
        px={0}
        onContextMenu={async (e) => {
          e.preventDefault();
          Menu.openMenu(await getSidebarItems());
        }}
      >
        {currentTab === "notebook" ? (
          <NotebookTree />
        ) : currentTab === "tag" ? (
          <Flex
            sx={{ height: "100vh", gap: 2, my: 1, flexDirection: "column" }}
          >
            <Button
              onClick={CREATE_BUTTON_MAP.tags.onClick}
              variant="secondary"
            >
              {CREATE_BUTTON_MAP.tags.title}
            </Button>
            <Tags isSidebar />
          </Flex>
        ) : (
          <FlexScrollContainer
            style={{
              flexDirection: "column",
              display: "flex"
            }}
            trackStyle={() => ({
              width: 3
            })}
            thumbStyle={() => ({ width: 3 })}
            suppressScrollX={true}
          >
            <Flex sx={{ flexDirection: "column" }}>
              <ReorderableList
                items={routes.filter((r) => !hiddenRoutes.includes(r.id))}
                orderKey={`sidebarOrder:routes`}
                order={() => db.settings.getSideBarOrder("routes")}
                onOrderChanged={(order) =>
                  db.settings.setSideBarOrder("routes", order)
                }
                renderOverlay={({ item }) => (
                  <NavigationItem
                    count={item.count}
                    id={item.id}
                    isTablet={isTablet}
                    title={item.title}
                    icon={item.icon}
                    tag={item.tag}
                    selected={
                      item.path === "/"
                        ? location === item.path
                        : location.startsWith(item.path)
                    }
                  />
                )}
                renderItem={({ item }) => (
                  <SortableNavigationItem
                    key={item.id}
                    id={item.id}
                    isTablet={isTablet}
                    title={item.title}
                    icon={item.icon}
                    tag={item.tag}
                    count={item.count}
                    onDragEnter={() => {
                      if (["/notebooks", "/tags"].includes(item.path))
                        dragTimeout.current = setTimeout(
                          () => _navigate(item.path),
                          1000
                        ) as unknown as number;
                    }}
                    onDragLeave={() => clearTimeout(dragTimeout.current)}
                    onDrop={async (e) => {
                      clearTimeout(dragTimeout.current);

                      await handleDrop(e.dataTransfer, {
                        type:
                          item.path === "/trash"
                            ? "trash"
                            : item.path === "/favorites"
                            ? "favorites"
                            : item.path === "/notebooks"
                            ? "notebooks"
                            : undefined
                      });
                    }}
                    selected={
                      item.path === "/"
                        ? location === item.path
                        : location.startsWith(item.path)
                    }
                    onClick={() => {
                      if (!isMobile && location === item.path)
                        return toggleNavigationContainer();
                      _navigate(item.path);
                    }}
                    menuItems={[
                      {
                        type: "lazy-loader",
                        key: "sidebar-items-loader",
                        items: getSidebarItems
                      }
                    ]}
                  />
                )}
              />

              <ReorderableList
                items={colors.filter((c) => !hiddenColors.includes(c.id))}
                orderKey={`sidebarOrder:colors`}
                order={() => db.settings.getSideBarOrder("colors")}
                onOrderChanged={(order) =>
                  db.settings.setSideBarOrder("colors", order)
                }
                renderOverlay={({ item }) => (
                  <NavigationItem
                    id={item.id}
                    isTablet={isTablet}
                    title={item.title}
                    icon={Circle}
                    color={item.colorCode}
                    count={item.count}
                    selected={location === `/colors/${item.id}`}
                  />
                )}
                renderItem={({ item: color }) => (
                  <SortableNavigationItem
                    id={color.id}
                    isTablet={isTablet}
                    key={color.id}
                    title={color.title}
                    count={color.count}
                    icon={Circle}
                    selected={location === `/colors/${color.id}`}
                    color={color.colorCode}
                    onClick={() => {
                      _navigate(`/colors/${color.id}`);
                    }}
                    onDrop={(e) => handleDrop(e.dataTransfer, color)}
                    menuItems={[
                      {
                        type: "button",
                        key: "rename-color",
                        title: strings.renameColor(),
                        onClick: () => RenameColorDialog.show(color)
                      },
                      {
                        type: "button",
                        key: "remove-color",
                        title: strings.removeColor(),
                        onClick: async () => {
                          await db.colors.remove(color.id);
                          await refreshNavItems();
                        }
                      },
                      {
                        type: "separator",
                        key: "sep"
                      },
                      {
                        type: "lazy-loader",
                        key: "sidebar-items-loader",
                        items: getSidebarItems
                      }
                    ]}
                  />
                )}
              />
              <Box
                bg="separator"
                my={1}
                sx={{ width: "85%", height: "0.8px", alignSelf: "center" }}
              />
              <ReorderableList
                items={shortcuts}
                orderKey={`sidebarOrder:shortcuts`}
                order={() => db.settings.getSideBarOrder("shortcuts")}
                onOrderChanged={(order) =>
                  db.settings.setSideBarOrder("shortcuts", order)
                }
                renderOverlay={({ item }) => (
                  <NavigationItem
                    id={item.id}
                    isTablet={isTablet}
                    key={item.id}
                    title={item.title}
                    icon={
                      item.type === "notebook"
                        ? Notebook2
                        : item.type === "tag"
                        ? Tag2
                        : Topic
                    }
                    isShortcut
                    selected={shouldSelectNavItem(location, item)}
                  />
                )}
                renderItem={({ item }) => (
                  <SortableNavigationItem
                    id={item.id}
                    isTablet={isTablet}
                    key={item.id}
                    title={item.title}
                    menuItems={[
                      {
                        type: "button",
                        key: "removeshortcut",
                        title: strings.doActions.remove.shortcut(1),
                        onClick: async () => {
                          await db.shortcuts.remove(item.id);
                          refreshNavItems();
                        }
                      }
                    ]}
                    icon={
                      item.type === "notebook"
                        ? Notebook2
                        : item.type === "tag"
                        ? Tag2
                        : Topic
                    }
                    isShortcut
                    selected={shouldSelectNavItem(location, item)}
                    onDrop={(e) => handleDrop(e.dataTransfer, item)}
                    onClick={async () => {
                      if (item.type === "notebook") {
                        const root = (
                          await db.notebooks.breadcrumbs(item.id)
                        ).at(0);
                        if (root && root.id !== item.id)
                          _navigate(`/notebooks/${root.id}/${item.id}`);
                        else _navigate(`/notebooks/${item.id}`);
                      } else if (item.type === "tag") {
                        _navigate(`/tags/${item.id}`);
                      }
                    }}
                  />
                )}
              />
            </Flex>
          </FlexScrollContainer>
        )}
      </Flex>
    </ScopedThemeProvider>
  );
}
export default NavigationMenu;

type NavigationDropdownProps = {
  toggleNavigationContainer: NavigationMenuProps["toggleNavigationContainer"];
};

function NavigationDropdown({
  toggleNavigationContainer
}: NavigationDropdownProps) {
  const isMobile = useMobile();
  const [location] = useLocation();
  const user = useUserStore((store) => store.user);
  const profile = useSettingStore((store) => store.profile);
  const theme = useThemeStore((store) => store.colorScheme);
  const toggleNightMode = useThemeStore((store) => store.toggleColorScheme);
  const setFollowSystemTheme = useThemeStore(
    (store) => store.setFollowSystemTheme
  );

  const { isPro } = useMemo(() => {
    const type = user?.subscription?.type;
    const expiry = user?.subscription?.expiry;
    if (!expiry) return { isBasic: true, remainingDays: 0 };
    return {
      isTrial: type === SUBSCRIPTION_STATUS.TRIAL,
      isBasic: type === SUBSCRIPTION_STATUS.BASIC,
      isBeta: type === SUBSCRIPTION_STATUS.BETA,
      isPro: type === SUBSCRIPTION_STATUS.PREMIUM,
      isProCancelled: type === SUBSCRIPTION_STATUS.PREMIUM_CANCELED,
      isProExpired: type === SUBSCRIPTION_STATUS.PREMIUM_EXPIRED
    };
  }, [user]);

  const notLoggedIn = Boolean(!user || !user.id);

  return (
    <Flex sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
      <Flex
        onClick={(e) => {
          e.preventDefault();
          Menu.openMenu(
            [
              {
                type: "popup",
                component: () => <UserProfile minimal />,
                key: "profile"
              },
              {
                type: "separator",
                key: "sep"
              },
              {
                type: "button",
                title: strings.login(),
                icon: Login.path,
                key: "login",
                isHidden: !notLoggedIn,
                onClick: () => hardNavigate("/login")
              },
              {
                type: "button",
                title: strings.toggleDarkLightMode(),
                key: "toggle-theme-mode",
                icon: theme === "dark" ? LightMode.path : DarkMode.path,
                onClick: () => {
                  setFollowSystemTheme(false);
                  toggleNightMode();
                }
              },
              {
                type: "button",
                title: strings.upgradeToPro(),
                icon: Pro.path,
                key: "upgrade",
                isHidden: notLoggedIn || isPro
              },
              {
                type: "button",
                title: settings.title,
                key: settings.id,
                icon: settings.icon.path,
                onClick: () => {
                  if (!isMobile && location === settings.path) {
                    return toggleNavigationContainer();
                  }
                  hashNavigate(settings.path);
                }
              },
              {
                type: "button",
                title: strings.helpAndSupport(),
                icon: Documentation.path,
                key: "help-and-support",
                onClick: () => {
                  window.open("https://help.notesnook.com/", "_blank");
                }
              },
              {
                type: "button",
                title: strings.logout(),
                icon: Logout.path,
                key: "logout",
                isHidden: notLoggedIn,
                onClick: async () => {
                  const result = await showLogoutConfirmation();
                  if (!result) return;

                  if (result.backup) {
                    try {
                      await createBackup({ mode: "partial" });
                    } catch (e) {
                      logger.error(e, "Failed to take backup before logout");
                      if (
                        !(await ConfirmDialog.show({
                          title: strings.failedToTakeBackup(),
                          message: strings.failedToTakeBackupMessage(),
                          negativeButtonText: strings.no(),
                          positiveButtonText: strings.yes()
                        }))
                      )
                        return;
                    }
                  }

                  await TaskManager.startTask({
                    type: "modal",
                    title: strings.loggingOut(),
                    subtitle: strings.pleaseWait(),
                    action: () => db.user.logout(true)
                  });
                  showToast("success", strings.loggedOut());
                }
              }
            ],
            {
              position: {
                target: e.currentTarget,
                location: "below",
                yOffset: 5
              }
            }
          );
        }}
        variant="columnCenter"
        sx={{
          bg: "shade",
          mr: 2,
          size: 35,
          borderRadius: 80,
          cursor: "pointer",
          position: "relative",
          outline: "1px solid var(--accent)",
          ":hover": {
            outline: "2px solid var(--accent)"
          }
        }}
      >
        {!user || !user.id || !profile?.profilePicture ? (
          <User size={30} />
        ) : (
          <Image
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 80
            }}
            src={profile.profilePicture}
          />
        )}
      </Flex>
    </Flex>
  );
}

type ReorderableListProps<T> = {
  orderKey: string;
  items: T[];
  renderItem: (props: { item: T }) => JSX.Element;
  renderOverlay: (props: { item: T }) => JSX.Element;
  onOrderChanged: (newOrder: string[]) => void;
  order: () => string[];
};

function ReorderableList<T extends { id: string }>(
  props: ReorderableListProps<T>
) {
  const {
    orderKey,
    items,
    renderItem: Item,
    renderOverlay: Overlay,
    onOrderChanged,
    order: _order
  } = props;
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const [activeItem, setActiveItem] = useState<T>();
  const [order, setOrder] = usePersistentState<string[]>(orderKey, _order());
  const orderedItems = orderItems(items, order);

  useEffect(() => {
    setOrder(_order());
  }, [_order]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      cancelDrop={() => {
        // if (!isUserPremium()) {
        //   showToast("error", "You need to be Pro to customize the sidebar.");
        //   return true;
        // }
        return false;
      }}
      onDragStart={(event) => {
        setActiveItem(orderedItems.find((i) => i.id === event.active.id));
      }}
      onDragEnd={(event) => {
        const { active, over } = event;

        const overId = over?.id as string;
        if (overId && active.id !== overId) {
          const transitionOrder =
            order.length === 0 || order.length !== orderedItems.length
              ? orderedItems.map((i) => i.id)
              : order;
          const newIndex = transitionOrder.indexOf(overId);
          const oldIndex = transitionOrder.indexOf(active.id as string);
          const newOrder = arrayMove(transitionOrder, oldIndex, newIndex);
          setOrder(newOrder);
          onOrderChanged(newOrder);
        }
        setActiveItem(undefined);
      }}
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always }
      }}
    >
      <SortableContext
        items={orderedItems}
        strategy={verticalListSortingStrategy}
      >
        {orderedItems.map((item) => (
          <Item key={item.id} item={item} />
        ))}

        <DragOverlay
          dropAnimation={{
            duration: 500,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)"
          }}
        >
          {activeItem && <Overlay item={activeItem} />}
        </DragOverlay>
      </SortableContext>
    </DndContext>
  );
}

function orderItems<T extends { id: string }>(items: T[], order: string[]) {
  const sorted: T[] = [];
  order.forEach((id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    sorted.push(item);
  });
  sorted.push(...items.filter((i) => !order.includes(i.id)));
  return sorted;
}

function toMenuItems<T extends { id: string; title: string }>(
  items: T[],
  hiddenIds: string[],
  onHiddenIdsUpdated: (ids: string[]) => void
): MenuItem[] {
  return items.map((item) => ({
    type: "button",
    key: item.id,
    title: item.title,
    isChecked: !hiddenIds.includes(item.id),
    onClick: async () => {
      const copy = hiddenIds.slice();
      const index = copy.indexOf(item.id);
      if (index > -1) copy.splice(index, 1);
      else copy.push(item.id);
      onHiddenIdsUpdated(copy);
    }
  }));
}
