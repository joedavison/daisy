import React from "react"
import { SafeAreaView } from "react-native"
import { Layout, Text } from "@ui-kitten/components"
import { useUser, useProfile, useRelays } from "store/hooks"
import { useDispatch } from "store"
import { doFetchProfile } from "store/notesSlice"
import { initRelays } from "store/settingsSlice"

export function LoadingScreen({ navigation, route }) {
  const { reset } = navigation
  const dispatch = useDispatch()
  const { pubkey } = useUser()
  const profile = useProfile(pubkey)
  const relays = useRelays()
  const hasRelays = relays.length > 0 && Boolean(relays.find((relay) => typeof relay.on === "function"))
  const hasProfile = Boolean(profile)

  React.useEffect(() => {
    dispatch(initRelays())
  }, [dispatch])

  React.useEffect(() => {
    if (!hasRelays) {
      return
    }

    if (!pubkey) {
      return reset({
        index: 0,
        routes: [{ name: "Auth" }],
      })
    }

    dispatch(doFetchProfile(pubkey))
  }, [hasRelays, pubkey, reset])

  React.useEffect(() => {
    if (hasProfile) {
      return reset({ index: 0, routes: [{ name: "Home" }] })
    }
  }, [reset, hasProfile])

  return (
    <Layout style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Layout style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Loading</Text>
        </Layout>
      </SafeAreaView>
    </Layout>
  )
}
