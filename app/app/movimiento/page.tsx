import React from "react";

type Home = {
  id: string;
  label: string;
};

type Movement = {
  id: string;
  description: string;
  amount: number;
  currency: string;
};

const activeHome: Home = {
  id: "hogar-87312",
  label: "Hogar activo · Casa del Centro",
};

const movements: Movement[] = [
  { id: "mov-01", description: "Compra de insumos", amount: -18000, currency: "ARS" },
  { id: "mov-02", description: "Pago de servicio", amount: -7200, currency: "ARS" },
  { id: "mov-03", description: "Reintegro", amount: 9500, currency: "ARS" },
];

export default function MovimientoPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-slate-500">Movimiento</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Hogar activo: {activeHome.label}
        </h1>
        <p className="text-slate-600">
          En la cabecera se muestra siempre el nombre (label) del hogar activo en
          lugar de su identificador técnico.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Últimos movimientos</h2>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {movements.map((movement) => (
            <article key={movement.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{movement.description}</p>
                <p className="text-xs text-slate-500">ID interno: {movement.id}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {movement.amount.toLocaleString("es-AR", {
                  style: "currency",
                  currency: movement.currency,
                  maximumFractionDigits: 0,
                })}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
