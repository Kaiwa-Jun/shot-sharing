interface SaveButtonProps {
  isSaved: boolean;
  onClick: () => void;
}

export function SaveButton({ isSaved, onClick }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
      aria-label={isSaved ? "保存を解除" : "保存"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
  );
}
