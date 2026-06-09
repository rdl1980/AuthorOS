/** Segnaposto per i moduli "planned": mostra cosa arriverà nelle fasi successive. */
export function makePlaceholder(title: string, description: string) {
  return function PlaceholderView(): JSX.Element {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🚧</div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-muted">{description}</p>
        <span className="mt-4 rounded-full border border-line px-3 py-1 text-xs text-muted">
          In arrivo — modulo pianificato
        </span>
      </div>
    )
  }
}
