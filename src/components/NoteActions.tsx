import React from "react"
import { View, Pressable, Share, Modal } from "react-native"
import { useTheme, Icon, Text } from "@ui-kitten/components"

import { NoteCreate } from "components"
import { nostrEventKinds } from "core/nostr"
import { useDispatch } from "store"
import { useNote, useReactions, useReposted } from "store/hooks"
import { doPublishNote, doLike } from "store/notesSlice"

type Props = {
  isThread?: boolean
  id: string
  style?: object
}

export const NoteActions: React.FC<Props> = ({ id }) => {
  const note = useNote(id)
  const { reactions, liked } = useReactions(id)
  const reposted = useReposted(id)
  const theme = useTheme()
  const dispatch = useDispatch()
  const [creatingNote, setCreatingNote] = React.useState(false)

  const defaultColor = theme["color-basic-600"]
  const interactedColor = theme["color-primary-500"]

  const iconProps = {
    height: 16,
    width: 16,
    fill: defaultColor,
  }

  const handleReply = () => setCreatingNote(true)

  const handleShare = async () => {
    try {
      await Share.share({
        message: `https://snort.social/e/${id}`,
      })
    } catch (error: any) {
      console.log("error sharing", error)
    }
  }

  const handleRepost = () => {
    dispatch(
      doPublishNote({
        kind: nostrEventKinds.repost,
        content: JSON.stringify(note),
        repostOf: id,
      })
    )
  }

  const handleLike = () => {
    dispatch(doLike(id))
  }

  return (
    <>
      <View style={{ flexDirection: "row", marginTop: 16, marginRight: 16, justifyContent: "space-between" }}>
        <Pressable onPress={handleReply}>
          <Icon {...iconProps} name="message-circle-outline" />
        </Pressable>
        <Pressable onPress={handleRepost}>
          <Icon {...iconProps} name="flip-2-outline" fill={reposted ? interactedColor : iconProps.fill} />
        </Pressable>
        <Pressable style={{ flexDirection: "row", alignItems: "center" }} onPress={handleLike}>
          <Icon
            {...iconProps}
            fill={liked ? interactedColor : iconProps.fill}
            name={liked ? "heart" : "heart-outline"}
          />
          {reactions.length > 0 && (
            <Text style={{ color: liked ? interactedColor : defaultColor, fontSize: 12, marginLeft: 8 }}>
              {reactions.length}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={handleShare}>
          <Icon {...iconProps} name="share-outline" />
        </Pressable>
      </View>
      {creatingNote && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setCreatingNote(false)
          }}
        >
          <NoteCreate id={id} closeModal={() => setCreatingNote(false)} />
        </Modal>
      )}
    </>
  )
}
