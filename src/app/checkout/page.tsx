'use client'

import { useEffect } from 'react'
import { initializePaddle } from '@paddle/paddle-js'
import { useSearchParams, useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const ptxn = searchParams.get('_ptxn')

      if (!ptxn) {
        console.error('Missing _ptxn')
        return
      }

      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
      const env = process.env.NEXT_PUBLIC_PADDLE_ENV

      if (!token) {
        console.error('Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN')
        return
      }

      const paddle = await initializePaddle({
        token,
        environment: env === 'sandbox' ? 'sandbox' : 'production',
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            router.push('/premium')
          }

          if (event.name === 'checkout.closed') {
            router.push('/premium')
          }
        },
      })

      if (!paddle) {
        console.error('Failed to initialize Paddle')
        return
      }

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