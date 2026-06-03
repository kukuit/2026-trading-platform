import { NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

const OrderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(8).max(20),
  address: z.string().trim().min(1).max(200),

  // NEW
  orangeType: z.enum(['type1', 'type2']).default('type1'),

  packageKey: z.enum(['5kg', '10kg', '20kg', 'other']),
  otherKg: z.string().trim().max(10).optional().default(''),

  time: z.string().trim().max(60).optional().default(''),
  note: z.string().trim().max(500).optional().default(''),
  payment: z.enum(['cod', 'bank']),

  hp: z.string().optional(), // honeypot
})

const PRICE_PER_KG: Record<'type1' | 'type2', number> = {
  type1: 36000,
  type2: 27000,
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
}

function parseKg(packageKey: string, otherKgRaw: string) {
  if (packageKey === '5kg') return 5
  if (packageKey === '10kg') return 10
  if (packageKey === '20kg') return 20

  // other
  const kgStr = (otherKgRaw || '').trim()
  if (!kgStr) throw new Error('Vui lòng nhập số kg muốn đặt.')
  if (!/^\d+(\.\d+)?$/.test(kgStr)) throw new Error('Số kg không hợp lệ.')

  const kg = Number(kgStr)
  if (!Number.isFinite(kg) || kg <= 0) throw new Error('Số kg không hợp lệ.')
  if (kg > 200) throw new Error('Số kg quá lớn.') // chặn cực đoan (tùy bạn)

  return kg
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = OrderSchema.parse(body)

    // honeypot
    if (parsed.hp && parsed.hp.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const unitPrice = PRICE_PER_KG[parsed.orangeType]
    const kg = parseKg(parsed.packageKey, parsed.otherKg)
    const totalPrice = Math.round(kg * unitPrice)

    const db = getAdminDb()

    // camhuucovn/mktonline/orders/{orderId}
    const colRef = db.collection('camhuucovn').doc('mktonline').collection('orders')
    const docRef = colRef.doc()

    await docRef.set({
      name: parsed.name,
      phone: normalizePhone(parsed.phone),
      address: parsed.address,

      orangeType: parsed.orangeType,
      unitPrice,
      kg,
      totalPrice,

      packageKey: parsed.packageKey,
      otherKg: parsed.otherKg || '',

      time: parsed.time || '',
      note: parsed.note || '',
      payment: parsed.payment,

      status: 'new',
      source: 'web',

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ ok: true, id: docRef.id }, { status: 200 })
  } catch (err: any) {
    // lỗi validate từ zod
    if (err?.issues) {
      return NextResponse.json(
        { ok: false, message: 'Dữ liệu chưa hợp lệ.', issues: err.issues },
        { status: 400 }
      )
    }

    // lỗi “parseKg” mình throw Error(message)
    const msg = err?.message || 'Server error'
    const status =
      msg.includes('kg') || msg.includes('Số kg') || msg.includes('Vui lòng') ? 400 : 500

    return NextResponse.json({ ok: false, message: msg }, { status })
  }
}
