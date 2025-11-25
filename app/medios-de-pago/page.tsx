import React from "react";

type Account = {
  id: string;
  label: string;
};

type PaymentMethod = {
  id: string;
  name: string;
  accountId: Account["id"];
};

const accounts: Account[] = [
  { id: "cta-001", label: "Cuenta operativa pesos" },
  { id: "cta-002", label: "Caja de ahorro en dólares" },
];

const paymentMethods: PaymentMethod[] = [
  {
    id: "mp-001",
    name: "Transferencia bancaria",
    accountId: "cta-001",
  },
  {
    id: "mp-002",
    name: "Pago en dólares",
    accountId: "cta-002",
  },
];

function getAccountLabel(accountId: string, allAccounts: Account[]): string {
  const fallback = accountId;
  const account = allAccounts.find((candidate) => candidate.id === accountId);
  return account?.label ?? fallback;
}

export default function MediosDePagoPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Medios de pago
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Cuentas asociadas con nombre visible
        </h1>
        <p className="text-slate-600">
          Los nombres de las cuentas se muestran usando el label configurado en
          cada cuenta, evitando exponer los IDs.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Detalle de medios
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {paymentMethods.map((method) => {
            const accountLabel = getAccountLabel(method.accountId, accounts);
            return (
              <article
                key={method.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">
                  {method.name}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {accountLabel}
                </p>
                <p className="text-xs text-slate-500">
                  ID interno: {method.id} · Cuenta vinculada: {accountLabel}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
