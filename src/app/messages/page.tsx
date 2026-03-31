'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Send, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ConversationItem {
  id: string
  other_user: { id: string; full_name: string; avatar_url: string | null }
  last_message?: { content: string; created_at: string }
}

interface MessageItem {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender?: { full_name: string; avatar_url: string | null }
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-[var(--gem-gray-400)]">Loading...</div>}>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const toParam = searchParams.get('to')
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [userId, setUserId] = useState<string>('')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConvo, setActiveConvo] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  // Initialize
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadConversations(user.id)

      // If ?to= param, find or create conversation
      if (toParam && toParam !== user.id) {
        await openOrCreateConversation(user.id, toParam)
      }
      setLoading(false)
    }
    init()
  }, [toParam])

  // Subscribe to new messages
  useEffect(() => {
    if (!activeConvo) return
    const channel = supabase
      .channel(`messages:${activeConvo}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvo}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as MessageItem])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConvo])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations(uid: string) {
    // Get all conversations the user is part of
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', uid)

    if (!participations?.length) return

    const convoIds = participations.map(p => p.conversation_id)

    // Get other participants
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profiles:user_id(id, full_name, avatar_url)')
      .in('conversation_id', convoIds)
      .neq('user_id', uid)

    // Get last message per conversation
    const convos: ConversationItem[] = []
    for (const part of allParticipants || []) {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', part.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      convos.push({
        id: part.conversation_id,
        other_user: part.profiles as any,
        last_message: lastMsg || undefined,
      })
    }

    // Sort by most recent message
    convos.sort((a, b) => {
      const aTime = a.last_message?.created_at || '0'
      const bTime = b.last_message?.created_at || '0'
      return bTime.localeCompare(aTime)
    })

    setConversations(convos)
  }

  async function openOrCreateConversation(uid: string, otherId: string) {
    // Check if conversation exists
    const { data: myConvos } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', uid)

    if (myConvos?.length) {
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherId)
        .in('conversation_id', myConvos.map(c => c.conversation_id))

      if (shared?.length) {
        setActiveConvo(shared[0].conversation_id)
        await loadMessages(shared[0].conversation_id)
        return
      }
    }

    // Create new conversation
    const { data: convo } = await supabase.from('conversations').insert({}).select().single()
    if (!convo) return

    await supabase.from('conversation_participants').insert([
      { conversation_id: convo.id, user_id: uid },
      { conversation_id: convo.id, user_id: otherId },
    ])

    setActiveConvo(convo.id)
    await loadConversations(uid)
  }

  async function loadMessages(convoId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  async function selectConversation(convoId: string) {
    setActiveConvo(convoId)
    await loadMessages(convoId)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !activeConvo || sending) return
    setSending(true)

    await supabase.from('messages').insert({
      conversation_id: activeConvo,
      sender_id: userId,
      content: newMessage.trim(),
    })

    setNewMessage('')
    setSending(false)
    await loadMessages(activeConvo)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-[var(--gem-gray-400)]">Loading...</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="grid md:grid-cols-[280px_1fr] gap-4 min-h-[calc(100vh-200px)]">
        {/* Conversation list */}
        <div className="border border-[var(--gem-gray-700)] rounded-xl overflow-hidden">
          <div className="p-3 border-b border-[var(--gem-gray-700)]">
            <span className="text-xs uppercase tracking-wider text-[var(--gem-gray-400)]">Conversations</span>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            {conversations.length > 0 ? (
              conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`w-full text-left px-3 py-3 border-b border-[var(--gem-gray-800)] hover:bg-[var(--gem-gray-800)] transition-colors ${
                    activeConvo === c.id ? 'bg-[var(--gem-gray-800)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--gem-gray-700)] flex items-center justify-center text-xs font-bold text-[var(--gem-accent)] uppercase shrink-0">
                      {c.other_user.full_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.other_user.full_name}</p>
                      {c.last_message && (
                        <p className="text-xs text-[var(--gem-gray-400)] truncate">{c.last_message.content}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-[var(--gem-gray-400)] p-4 text-center">No conversations yet</p>
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className="border border-[var(--gem-gray-700)] rounded-xl flex flex-col overflow-hidden">
          {activeConvo ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[60vh]">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-xl px-4 py-2 ${
                        msg.sender_id === userId
                          ? 'bg-[var(--gem-accent)] text-white'
                          : 'bg-[var(--gem-gray-800)] text-[var(--gem-gray-200)]'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.sender_id === userId ? 'text-white/60' : 'text-[var(--gem-gray-500)]'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="border-t border-[var(--gem-gray-700)] p-3 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 !rounded-full"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 rounded-full bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-[var(--gem-gray-400)] text-sm">
              Select a conversation or message a creator from their profile
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
