export type PackageKey = '5kg' | '10kg' | '20kg' | 'other'

export type PaymentKey = 'cod' | 'bank'

export type OrderFormState = {
  name: string
  phone: string
  address: string
  packageKey: PackageKey
  otherKg: string
  time: string
  note: string
  payment: PaymentKey
}
