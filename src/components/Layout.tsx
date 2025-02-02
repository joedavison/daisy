import React from "react"
import { Layout as KittensLayout } from "@ui-kitten/components"

export function Layout({ children }) {
  return <KittensLayout style={{ flex: 1 }}>{children}</KittensLayout>
}
