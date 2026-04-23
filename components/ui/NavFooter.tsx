import { Btn } from "./Btn";

interface NavFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
}

export function NavFooter({
  onBack,
  onNext,
  backLabel = "← Anterior",
  nextLabel = "Siguiente →",
  nextDisabled,
}: NavFooterProps) {
  return (
    <div className="flex justify-between gap-2.5 px-4 py-4 pb-6">
      {onBack ? (
        <Btn onClick={onBack} variant="outline">{backLabel}</Btn>
      ) : (
        <div />
      )}
      {onNext && (
        <Btn onClick={onNext} disabled={nextDisabled}>{nextLabel}</Btn>
      )}
    </div>
  );
}
