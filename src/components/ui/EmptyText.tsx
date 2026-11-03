/** 빈 화면 문구. 여러 줄이면 첫 줄은 제목으로 더 굵고 진하게 보여준다. */
export function EmptyText({ message }: { message: string }) {
  const [first, ...rest] = message.split("\n");
  if (rest.length === 0) return <>{message}</>;
  return (
    <>
      <span className="block text-lg font-bold text-midnight-ink">{first}</span>
      <span className="mt-2 block">{rest.join("\n")}</span>
    </>
  );
}
