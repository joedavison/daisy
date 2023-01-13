import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { AppDispatch, GetState } from "store"
import {
  getProfile,
  getEventsFromPubkeys,
  subscribeToContactList,
  publishNote,
  nostrEventKinds,
  getReplies,
} from "core/nostr"

export interface NotesState {
  loading: boolean
  notesById: Record<string, NostrNoteEvent | NostrRepostEvent>
  profilesByPubkey: Record<string, NostrProfile>
  contactListsByPubkey: Record<string, NostrContactListEvent>
  feedsByIdOrPubkey: Record<string, string[]>
  feedsByPubkey: Record<string, string[]>
  loadingByIdOrPubkey: Record<string, boolean>
}

const initialState = {
  notesById: {},
  profilesByPubkey: {},
  feedsByIdOrPubkey: {},
  contactListsByPubkey: {},
  loadingByIdOrPubkey: {},
} as NotesState

export const notesSlice = createSlice({
  name: "notes",
  initialState: initialState,
  reducers: {
    updateNotesById(state, action: PayloadAction<Record<string, NostrNoteEvent>>) {
      state.notesById = { ...state.notesById, ...action.payload }
    },

    updateProfilesByPubkey(state, action: PayloadAction<Record<string, NostrProfile>>) {
      state.profilesByPubkey = { ...state.profilesByPubkey, ...action.payload }
    },

    updateContactListsByPubkey(state, action: PayloadAction<Record<string, NostrContactListEvent>>) {
      // @ts-expect-error wtf
      state.contactListsByPubkey = { ...state.profilesByPubkey, ...action.payload }
    },

    updateNotesAndProfiles(
      state,
      action: PayloadAction<{ notes: NostrEvent[]; profiles: Record<string, NostrProfile> }>
    ) {
      const { notes, profiles } = action.payload

      state.notesById = {
        ...state.notesById,
        ...notes.reduce((acc, note) => ({ ...acc, [note.id]: note }), {}),
      }
      state.profilesByPubkey = { ...state.profilesByPubkey, ...profiles }
      state.loading = false
    },

    updatefeedsByIdOrPubkey(state, action: PayloadAction<Record<string, string[]>>) {
      state.feedsByIdOrPubkey = { ...state.feedsByIdOrPubkey, ...action.payload }
    },

    addNoteToFeedById(state, action: PayloadAction<{ feedId: string; noteId: string }>) {
      const { feedId, noteId } = action.payload

      const currentFeed = state.feedsByIdOrPubkey[feedId]
      const currentFeedSet = new Set(currentFeed)
      currentFeedSet.add(noteId)

      state.feedsByIdOrPubkey[feedId] = Array.from(currentFeedSet)
    },
    updateloadingByIdOrPubkey(state, action: PayloadAction<Record<string, boolean>>) {
      state.loadingByIdOrPubkey = { ...state.loadingByIdOrPubkey, ...action.payload }
    },
  },
})

export const {
  updateNotesById,
  updateProfilesByPubkey,
  updateContactListsByPubkey,
  updateNotesAndProfiles,
  updatefeedsByIdOrPubkey,
  addNoteToFeedById,
  updateloadingByIdOrPubkey,
} = notesSlice.actions

export const doFetchProfile = (pubkey: string) => async (dispatch: AppDispatch, getState: GetState) => {
  const {
    settings: { relays },
    notes: { profilesByPubkey },
  } = getState()

  const hasProfile = profilesByPubkey[pubkey]

  dispatch(updateloadingByIdOrPubkey({ [pubkey]: true }))

  if (!hasProfile) {
    const { profile, contactList } = await getProfile(relays, pubkey)
    dispatch(updateProfilesByPubkey({ [pubkey]: profile }))
    dispatch(updateContactListsByPubkey({ [pubkey]: contactList }))
  }

  const { notes, profiles } = await getEventsFromPubkeys(relays, [pubkey])

  dispatch(
    updateNotesAndProfiles({
      notes,
      profiles,
    })
  )
  dispatch(updatefeedsByIdOrPubkey({ [pubkey]: Array.from(new Set(notes.map((note) => note.id))) }))
  dispatch(updateloadingByIdOrPubkey({ [pubkey]: false }))
}

export const doPopulateFollowingFeed = () => async (dispatch: AppDispatch, getState: GetState) => {
  const { settings: settingsState, notes: notesState } = getState()
  const { contactListsByPubkey } = notesState
  const contactList = contactListsByPubkey[settingsState.user.pubkey]
  const pubkeys = contactList.tags.map((tag) => tag[1])

  dispatch(updateloadingByIdOrPubkey({ following: true }))

  const { notes, profiles } = await getEventsFromPubkeys(settingsState.relays, pubkeys)

  dispatch(
    updateNotesAndProfiles({
      notes,
      profiles,
    })
  )

  dispatch(updatefeedsByIdOrPubkey({ following: Array.from(new Set(notes.map((note) => note.id))) }))
  dispatch(updateloadingByIdOrPubkey({ following: false }))

  // subscribeToContactList(settingsState.relays, contactList, (nostrEvent: NostrEvent) => {
  //   if (nostrEvent.kind === 1) {
  //     dispatch(
  //       updateNotesById({
  //         [nostrEvent.id]: nostrEvent,
  //       })
  //     )

  //     dispatch(addNoteToFeedById({ feedId: "following", noteId: nostrEvent.id }))
  //   }
  // })
}

export const doFetchReplies = (noteIds: string[]) => async (dispatch: AppDispatch, getState: GetState) => {
  const { settings: settingsState } = getState()

  const loadingState = noteIds.reduce((acc, noteId) => ({ ...acc, [noteId]: true }), {})
  dispatch(updateloadingByIdOrPubkey(loadingState))

  const replies = await getReplies(settingsState.relays, noteIds)
  const finishedLoadingState = noteIds.reduce((acc, noteId) => ({ ...acc, [noteId]: false }), {})
  dispatch(updateloadingByIdOrPubkey(finishedLoadingState))

  if (!replies.length) {
    return
  }

  const repliesMap = replies.reduce((acc, reply) => ({ ...acc, [reply.id]: reply }), {})

  dispatch(updateNotesById(repliesMap))
}

export const doPublishNote =
  (content: string, onSuccess: () => void, replyId?: string) =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const { settings: settingsState } = getState()
    const { user } = settingsState

    if (!user.pubkey || !user.privateKey) {
      console.log("no user found")
      return
    }

    let tags = []
    if (replyId) {
      tags.push(["e", replyId])
    }

    const note = await publishNote(
      settingsState.relays,
      // @ts-expect-error
      settingsState.user,
      nostrEventKinds.note,
      content,
      tags
    )

    dispatch(updateNotesById({ [note.id]: note }))
    dispatch(addNoteToFeedById({ feedId: "following", noteId: note.id }))
    if (onSuccess) {
      onSuccess()
    }
  }

export const doToggleFollow =
  (pubkey: string, isFollowing: boolean) => async (dispatch: AppDispatch, getState: GetState) => {
    const { settings: settingsState, notes: notesState } = getState()
    const { user, relays } = settingsState
    const { contactListsByPubkey } = notesState
    const contactList = contactListsByPubkey[user.pubkey]

    if (!contactList) {
      console.log("unable to find contactList")
      return
    }

    if (!user.pubkey || !user.privateKey) {
      console.log("no user found")
      return
    }

    let newTags = contactList.tags.slice()

    if (isFollowing) {
      newTags.push(["p", pubkey])
    } else {
      newTags = newTags.filter((tag) => tag[1] !== pubkey)
    }

    const resolvedContactList = await publishNote(
      relays,
      // @ts-expect-error
      user,
      nostrEventKinds.contactList,
      "",
      newTags
    )
    // @ts-expect-error
    dispatch(updateContactListsByPubkey({ [user.pubkey]: resolvedContactList }))
  }
