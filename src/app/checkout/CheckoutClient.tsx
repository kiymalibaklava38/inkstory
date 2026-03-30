'use client'

import { useEffect } from 'react'
import { initializePaddle } from '@paddle/paddle-js'
import { useSearchParams, useRouter } from 'next/navigation'

export default function CheckoutClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const ptxn = searchParams.get('_ptxn')

      if (!ptxn) {
        console.error('Missing _ptxn')
        return
      }

      const paddle = await initializePaddle({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        environment:
          process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox'
            ? 'sandbox'
            : 'production',
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            router.push('/premium')
          }
        },
      })

      if (!paddle) return

      paddle.Checkout.open({
        transactionId: ptxn,
      })
    }

    run()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Ödeme açılıyor...</p>
    </div>
  )
}