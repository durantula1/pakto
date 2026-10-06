"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  type Key,
  TabList as TabListPrimitive,
  Tab as TabPrimitive,
  Tabs as TabsPrimitive,
} from "react-aria-components"

import { cn } from "@/lib/utils"

/*
 * React Aria only drives the tab strip (keyboard, focus, roles). The panels are plain elements outside it:
 * React Aria renders everything inside <Tabs> a second time into a hidden <template> to collect the tabs,
 * and panel content that the server streams in later left its placeholders in that template, where the
 * browser cannot find them ("$RS … parentNode" errors and React hydration error #418 on every tabbed page).
 */
const TabsSelection = React.createContext<{ selected: Key | null; select: (key: Key) => void } | null>(null)

function Tabs({
  className,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  selectedKey?: Key
  defaultSelectedKey?: Key
  onSelectionChange?: (key: Key) => void
}) {
  const [own, setOwn] = React.useState<Key | null>(defaultSelectedKey ?? null)
  const selected = selectedKey ?? own
  const select = React.useCallback((key: Key) => {
    setOwn(key)
    onSelectionChange?.(key)
  }, [onSelectionChange])
  const value = React.useMemo(() => ({ selected, select }), [selected, select])
  return (
    <TabsSelection.Provider value={value}>
      <div
        data-slot="tabs"
        data-orientation="horizontal"
        className={cn(
          "group/tabs flex gap-2 data-horizontal:flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </TabsSelection.Provider>
  )
}

const tabsListVariants = cva(
        "group/tabs-list inline-flex w-fit max-w-full items-center justify-start overflow-x-auto rounded-xl p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-sidebar shadow-sm",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabListPrimitive> &
  VariantProps<typeof tabsListVariants>) {
  const tabs = React.useContext(TabsSelection)
  return (
    <TabsPrimitive
      className="contents"
      selectedKey={tabs?.selected ?? undefined}
      onSelectionChange={(key) => { if (key != null) tabs?.select(key) }}
    >
      <TabListPrimitive
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </TabsPrimitive>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabPrimitive>) {
  return (
    <TabPrimitive
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-8 flex-1 cursor-default items-center justify-center gap-1.5 rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=line]/tabs-list:data-selected:shadow-none group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-selected:bg-transparent dark:group-data-[variant=line]/tabs-list:data-selected:border-transparent dark:group-data-[variant=line]/tabs-list:data-selected:bg-transparent",
        "group-data-[variant=default]/tabs-list:h-8 group-data-[variant=default]/tabs-list:flex-none group-data-[variant=default]/tabs-list:rounded-lg group-data-[variant=default]/tabs-list:text-sidebar-foreground/70 group-data-[variant=default]/tabs-list:hover:bg-sidebar-accent group-data-[variant=default]/tabs-list:hover:text-sidebar-foreground",
        "group-data-[variant=default]/tabs-list:data-selected:bg-primary group-data-[variant=default]/tabs-list:data-selected:font-semibold group-data-[variant=default]/tabs-list:data-selected:text-primary-foreground group-data-[variant=default]/tabs-list:data-selected:shadow-sm group-data-[variant=default]/tabs-list:data-selected:hover:bg-primary group-data-[variant=default]/tabs-list:data-selected:hover:text-primary-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-selected:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

/** The selected tab's panel; the others are not rendered, as React Aria did before. */
function TabsContent({
  id,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "id"> & { id: Key }) {
  const tabs = React.useContext(TabsSelection)
  if (tabs?.selected !== id) return null
  return (
    <div
      role="tabpanel"
      tabIndex={0}
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

/** The real tab strip for loading states; panels are rendered by the caller below it. */
function TabsSkeleton({
  labels,
  className,
}: {
  labels: string[]
  className?: string
}) {
  return (
    <Tabs className={className} defaultSelectedKey={labels[0]}>
      <TabsList>
        {labels.map((label) => (
          <TabsTrigger key={label} id={label}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsSkeleton, tabsListVariants }
