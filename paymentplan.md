# 💳 Payment System UI (Checkout Window + Dashboard Widget)

## 🎯 Objetivo

Implementar un sistema de pagos con:

1. **Ventana de pago dedicada (Checkout Page / Modal)**
2. **Widget de créditos en el dashboard**
3. Integración con:

   * Stripe (tarjetas)
   * BitPay (cripto con descuento)

---

# 🧩 1. Arquitectura general

## Componentes principales

* `BillingService` (backend)
* `WalletService` (créditos)
* `Checkout UI`
* `Dashboard Widget`
* Webhooks (Stripe / BitPay)

---

# 🧱 2. Modelo de datos

```sql
users
- id
- email

wallets
- id
- user_id
- credits_subscription
- credits_purchased
- updated_at

transactions
- id
- user_id
- type (subscription | topup | usage)
- provider (stripe | bitpay)
- amount_usd
- credits_added
- status (pending | completed | failed)
- created_at

subscriptions
- id
- user_id
- plan_name
- monthly_credits
- renew_date
- status
```

---

# 💻 3. Dashboard Widget (Créditos)

## 🎯 Objetivo

Mostrar estado actual + acceso rápido a pago

## UI (mínimo)

```
[ Créditos disponibles ]

12,450 créditos

- Uso este mes: 3,200
- Próxima renovación: 12 abril

[ Recargar créditos ]
[ Ver planes ]
```

---

## 🧠 Lógica

* Mostrar:

  * `credits_subscription`
  * `credits_purchased`
  * total combinado

```ts
const totalCredits = subscriptionCredits + purchasedCredits;
```

---

## 🔘 Acciones

* **Recargar créditos**
  → abre Checkout

* **Ver planes**
  → redirige a suscripciones

---

## ⚠️ Estados importantes

* ⚠️ Bajo saldo (< X créditos)
* ❌ Sin créditos

👉 Mostrar alertas visibles

---

# 🪟 4. Ventana de Pago (Checkout)

## Opciones UX

### A) Página dedicada

`/billing`

### B) Modal overlay (recomendado)

* mejor UX
* no rompe flujo

---

## 🎯 Contenido del Checkout

### 1. Selección de producto

#### 🔵 Suscripciones

* Starter → 10,000 créditos / mes
* Pro → 50,000 créditos / mes

#### 🟡 Créditos extra

* 5,000 créditos
* 10,000 créditos
* 50,000 créditos

---

### 2. Método de pago

```
Elegir método:

( ) Tarjeta
( ) Cripto (10% descuento)
```

---

### 💳 Stripe Flow

* Crear `Checkout Session`
* Redirigir o usar embedded

---

### 🪙 BitPay Flow

* Crear invoice
* Redirigir a pago
* Esperar webhook

---

## 💡 Ejemplo UI

```
Comprar créditos

[ 10,000 créditos - $10 ]
[ 50,000 créditos - $45 ]

Método:
(•) Cripto (-10%)
( ) Tarjeta

[ Pagar ahora ]
```

---

# 🔌 5. Backend (Flujo)

## Stripe

### Crear sesión

```ts
POST /api/billing/stripe/create-checkout
```

---

### Webhook

```ts
POST /api/webhooks/stripe
```

Acciones:

* validar evento
* agregar créditos
* guardar transacción

---

## BitPay

### Crear invoice

```ts
POST /api/billing/bitpay/create-invoice
```

---

### Webhook

```ts
POST /api/webhooks/bitpay
```

Acciones:

* verificar pago
* agregar créditos (con bonus/descuento)
* marcar como completado

---

# 🔄 6. Sistema de Créditos

## Consumo

```ts
function consumeCredits(user, amount) {
  if (user.subscriptionCredits >= amount) {
    user.subscriptionCredits -= amount;
  } else {
    let remaining = amount - user.subscriptionCredits;
    user.subscriptionCredits = 0;
    user.purchasedCredits -= remaining;
  }
}
```

---

# 🎁 7. Descuento Cripto

## Regla

```ts
if (paymentMethod === "bitpay") {
  credits = baseCredits * 1.1;
}
```

👉 Alternativa:

* bajar precio en vez de aumentar créditos

---

# 🧠 8. Seguridad

* Validar webhooks (firma)
* No confiar en frontend
* Idempotencia en pagos

---

# 📊 9. Eventos importantes

* `payment_completed`
* `credits_added`
* `credits_consumed`
* `subscription_renewed`

---

# 🧭 10. UX clave

## Reglas

* Mostrar SIEMPRE créditos restantes
* Avisar antes de quedarse sin saldo
* No cobrar sin acción explícita (salvo auto-recharge)

---

# 🚀 11. Mejoras futuras

* Auto-recarga
* Facturación detallada
* Marketplace de agentes
* Cupones / descuentos
* Referral credits

---

# ✅ Checklist de implementación

* [ ] Wallet creada
* [ ] Widget en dashboard
* [ ] Checkout modal/page
* [ ] Stripe integrado
* [ ] BitPay integrado
* [ ] Webhooks funcionando
* [ ] Sistema de créditos conectado a APIs

---

# 🧠 Nota final

Este sistema convierte tu app en:

👉 “una economía interna basada en créditos”

Lo que permite escalar:

* APIs
* agentes
* marketplace

sin cambiar el modelo de negocio.