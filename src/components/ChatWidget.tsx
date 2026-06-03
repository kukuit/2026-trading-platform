'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { MessageCircle, X, SendHorizonal } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const ASK_TAG = '[ASK_CONTACT_INFO]'

// ===== Pro rules =====
const AUTO_OPEN_AFTER_MS = 15000 // 15s
const REQUIRED_SCROLL_RATIO = 0.25 // 25%
const AUTO_HIDE_AFTER_MS = 7000 // mở xong 7s tự ẩn (nếu user không tương tác)

// ===== Session keys (1 lần / session) =====
const SESSION_AUTOSHOW_KEY = 'camhuuco_chat_autoshow_done'
const SESSION_INTERACTED_KEY = 'camhuuco_chat_interacted_session'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Mình là Cam Hữu Cơ ChatBot. Bạn đang muốn tư vấn về cam hữu cơ, cam tươi hay các sản phẩm từ cam (nước cam, siro, cam mật ong, cam sấy...)?',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [showLeadForm, setShowLeadForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // ===== refs to avoid stale state inside timers =====
  const hasInteractedRef = useRef(false)
  const inputRef = useRef('')
  const isSendingRef = useRef(false)
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    hasInteractedRef.current = hasInteracted
  }, [hasInteracted])

  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    isSendingRef.current = isSending
  }, [isSending])

  // ===== timers =====
  const timeTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (timeTimerRef.current) window.clearTimeout(timeTimerRef.current)
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    timeTimerRef.current = null
    hideTimerRef.current = null
  }

  const markInteracted = () => {
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true
      setHasInteracted(true)
    }
    autoOpenedRef.current = false
    clearTimers()

    try {
      sessionStorage.setItem(SESSION_INTERACTED_KEY, '1')
    } catch {}
  }

  // Load interacted flag (session)
  useEffect(() => {
    try {
      const interactedSession = sessionStorage.getItem(SESSION_INTERACTED_KEY) === '1'
      if (interactedSession) {
        setHasInteracted(true)
        hasInteractedRef.current = true
      }
    } catch {}
  }, [])

  // Auto-open condition: 15s + scroll 25% + only once/session
  useEffect(() => {
    if (hasInteractedRef.current) return

    // only once per session
    try {
      const done = sessionStorage.getItem(SESSION_AUTOSHOW_KEY) === '1'
      if (done) return
    } catch {}

    let timeReady = false
    let scrollReady = false
    let didTrigger = false

    const tryTrigger = () => {
      if (didTrigger) return
      if (hasInteractedRef.current) return
      if (!timeReady || !scrollReady) return

      didTrigger = true

      // mark session done
      try {
        sessionStorage.setItem(SESSION_AUTOSHOW_KEY, '1')
      } catch {}

      // open + auto-hide
      setIsOpen(true)
      autoOpenedRef.current = true

      hideTimerRef.current = window.setTimeout(() => {
        // chỉ auto-hide nếu vẫn đang là auto-open, và user chưa tương tác
        if (!autoOpenedRef.current) return
        if (hasInteractedRef.current) return
        if (isSendingRef.current) return
        if (inputRef.current.trim().length > 0) return

        setIsOpen(false)
        autoOpenedRef.current = false
      }, AUTO_HIDE_AFTER_MS)
    }

    // 1) Time ready after 15s
    timeTimerRef.current = window.setTimeout(() => {
      timeReady = true
      tryTrigger()
    }, AUTO_OPEN_AFTER_MS)

    // 2) Scroll ready at 25%
    const doc = document.documentElement
    const checkScroll = () => {
      const maxScroll = doc.scrollHeight - window.innerHeight

      // page không scroll được => coi như đạt scroll condition
      if (maxScroll <= 0) {
        scrollReady = true
        tryTrigger()
        return
      }

      const y = window.scrollY || window.pageYOffset || 0
      const ratio = maxScroll > 0 ? y / maxScroll : 1
      if (ratio >= REQUIRED_SCROLL_RATIO) {
        scrollReady = true
        tryTrigger()
      }
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        checkScroll()
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    checkScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showLeadForm])

  const toggleOpen = () => {
    // user bấm => coi là interacted (từ đó không auto-open/auto-hide nữa)
    markInteracted()
    setIsOpen((prev) => !prev)
  }

  const handleSend = async () => {
    if (!input.trim() || isSending) return

    markInteracted()

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]

    setMessages(newMessages)
    setInput('')
    setIsSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.error as string }])
      } else {
        const rawReply = String(data.reply ?? '')
        const shouldAskContact = rawReply.includes(ASK_TAG)
        const cleanedReply = rawReply.replace(ASK_TAG, '').trim()

        setMessages((prev) => [...prev, { role: 'assistant', content: cleanedReply }])

        if (shouldAskContact) setShowLeadForm(true)
      }
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Kết nối có lỗi, bạn thử gửi lại giúp mình nhé.' },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Lead info:', { name, phone, note })

    alert('Cảm ơn bạn! Bên Cam Hữu Cơ sẽ liên hệ với bạn sớm nhất.')

    setName('')
    setPhone('')
    setNote('')
    markInteracted()
  }

  return (
    <>
      {/* Nút chat tròn */}
      <button
        onClick={toggleOpen}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:scale-105 hover:bg-blue-500 focus:outline-none"
        aria-label="Mở chat hỗ trợ"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* Chat window + animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="camhuuco-chat"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-20 right-4 z-50 flex w-80 max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2 text-white">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10">
                  <Image
                    src="/images/camhuuco-bot.png"
                    alt="Cam Hữu Cơ ChatBot"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Cam Hữu Cơ ChatBot</span>
                  <span className="text-[11px] text-blue-100">Đang online - sẵn sàng hỗ trợ</span>
                </div>
              </div>
              <button
                onClick={toggleOpen}
                className="rounded-full p-1 hover:bg-white/10"
                aria-label="Đóng chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat content + form + input */}
            <div className="flex max-h-96 flex-col bg-slate-50">
              <div className="camhuuco-chat-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="mr-2 mt-1 h-7 w-7 overflow-hidden rounded-full bg-blue-500/10">
                          <Image
                            src="/images/camhuuco-bot.png"
                            alt="Cam Hữu Cơ ChatBot"
                            width={28}
                            height={28}
                            className="h-7 w-7 object-cover"
                          />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                          isUser
                            ? 'rounded-br-sm bg-blue-600 text-white'
                            : 'rounded-tl-sm bg-white text-slate-900'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  )
                })}

                {isSending && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
                    Cam Hữu Cơ ChatBot đang trả lời.
                  </div>
                )}

                {showLeadForm && (
                  <form
                    onSubmit={handleSubmitLead}
                    className="mt-1 space-y-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-3 text-xs shadow-sm"
                  >
                    <p className="text-[11px] text-slate-600">
                      Để bên Cam Hữu Cơ hỗ trợ bạn tốt hơn, bạn cho mình xin <b>tên</b> và{' '}
                      <b>số điện thoại</b> nhé.
                      <br />
                      Nếu chưa tiện, bạn vẫn có thể tiếp tục chat bên dưới.
                    </p>

                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-slate-700">Tên của bạn</label>
                      <input
                        className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                        placeholder="Ví dụ: Khang"
                        value={name}
                        onChange={(e) => {
                          markInteracted()
                          setName(e.target.value)
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-slate-700">Số điện thoại</label>
                      <input
                        className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                        placeholder="Ví dụ: 09xx xxx xxx"
                        value={phone}
                        onChange={(e) => {
                          markInteracted()
                          setPhone(e.target.value)
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-slate-700">
                        Bạn muốn tư vấn gì thêm? (không bắt buộc)
                      </label>
                      <textarea
                        className="min-h-[50px] w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                        placeholder="Ví dụ: Mình muốn đặt cam tươi 5kg, giao nội thành."
                        value={note}
                        onChange={(e) => {
                          markInteracted()
                          setNote(e.target.value)
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 active:scale-[0.98]"
                    >
                      Gửi thông tin cho Cam Hữu Cơ
                    </button>

                    <p className="text-[10px] text-slate-400">
                      Khi gửi thông tin, bạn đồng ý để Cam Hữu Cơ liên hệ qua số điện thoại bạn cung
                      cấp.
                    </p>
                  </form>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmitInput}
                className="flex items-center gap-2 border-t border-slate-200 bg-white px-2 py-2"
              >
                <input
                  className="h-9 flex-1 rounded-full border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                  placeholder="Nhập câu hỏi của bạn."
                  value={input}
                  onChange={(e) => {
                    // user bắt đầu gõ => coi là interacted để khỏi auto-hide
                    markInteracted()
                    setInput(e.target.value)
                  }}
                />
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  aria-label="Gửi tin nhắn"
                >
                  <SendHorizonal className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
