interface Props {
  onClick: () => void;
}

export function BurgerMenu({ onClick }: Props) {
  return (
    <button className="burger-menu" aria-label="Menu" onClick={onClick}>
      <span />
      <span />
      <span />
    </button>
  );
}