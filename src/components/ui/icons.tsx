import { useId, type ReactNode, type SVGProps } from "react";

/**
 * 하단 메뉴와 킵박스 화면이 함께 쓰는 솔리드 아이콘 세트.
 * 모서리를 둥글린 면 위에 안쪽 라인·세부 요소는 배경이 비치도록 파낸다.
 * 파낸 라인의 두께는 모든 아이콘에서 2로 같다.
 */
const OUTLINE = 1.6;

function SolidIcon({
  shape,
  cuts,
  ...props
}: { shape: ReactNode; cuts: ReactNode } & SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="#fff" />
          <g fill="#000" stroke="#000">
            {cuts}
          </g>
        </mask>
      </defs>
      <g
        mask={`url(#${id})`}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={OUTLINE}
        strokeLinejoin="round"
      >
        {shape}
      </g>
    </svg>
  );
}

/** 라인(파낸 부분): 두께 2, 끝은 둥글게 */
function Line({ x, y, w }: { x: number; y: number; w: number }) {
  return <rect x={x} y={y} width={w} height={2} rx={1} stroke="none" />;
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidIcon
      {...props}
      shape={<path d="M12 3 3.2 11a.8.8 0 0 0 .55 1.4H5V20a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20v-7.6h1.25a.8.8 0 0 0 .55-1.4L12 3Z" />}
      cuts={<path d="M10 23v-6.5a2 2 0 0 1 4 0V23h-4Z" stroke="none" />}
    />
  );
}

export function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidIcon
      {...props}
      shape={<rect x="4.5" y="3.5" width="15" height="17" rx="3.5" />}
      cuts={
        <>
          <Line x={8} y={9} w={8} />
          <Line x={8} y={13} w={8} />
        </>
      }
    />
  );
}

export function BoxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidIcon
      {...props}
      shape={
        <>
          <rect x="3.5" y="4" width="17" height="5" rx="2.2" />
          <path d="M5 11.5h14v6.2a2.8 2.8 0 0 1-2.8 2.8H7.8A2.8 2.8 0 0 1 5 17.7v-6.2Z" />
        </>
      }
      cuts={<Line x={9} y={14.5} w={6} />}
    />
  );
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidIcon
      {...props}
      shape={<path d="M15.4 4.6a2.2 2.2 0 0 1 3.1 0l.9.9a2.2 2.2 0 0 1 0 3.1L9.2 18.8a2 2 0 0 1-.9.5l-3.7.9a.6.6 0 0 1-.7-.7l.9-3.7a2 2 0 0 1 .5-.9L15.4 4.6Z" />}
      cuts={<path d="m13.2 6.8 4 4" stroke="#000" strokeWidth={2} strokeLinecap="round" fill="none" />}
    />
  );
}

/** 순서 변경 핸들(햄버거). 굵기 2의 둥근 가로 막대 세 개 */
export function GripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidIcon
      {...props}
      shape={
        <>
          <rect x="4" y="5.2" width="16" height="3.2" rx="1.6" />
          <rect x="4" y="10.4" width="16" height="3.2" rx="1.6" />
          <rect x="4" y="15.6" width="16" height="3.2" rx="1.6" />
        </>
      }
      cuts={null}
    />
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidIcon
      {...props}
      shape={
        <>
          <rect x="9" y="2.5" width="6" height="3.5" rx="1.5" />
          <rect x="3.5" y="5.5" width="17" height="3" rx="1.5" />
          <path d="M5.5 10.5h13l-.8 8.2a2.6 2.6 0 0 1-2.6 2.3H8.9a2.6 2.6 0 0 1-2.6-2.3l-.8-8.2Z" />
        </>
      }
      cuts={
        <>
          <rect x="9" y="12.5" width="2" height="5" rx="1" stroke="none" />
          <rect x="13" y="12.5" width="2" height="5" rx="1" stroke="none" />
        </>
      }
    />
  );
}

/** 이미지가 없을 때 보여주는 사진 아이콘. 기존 아이콘처럼 둥근 솔리드 면으로 그린다. */
export function ImagePlaceholderIcon(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      role={props["aria-label"] ? "img" : undefined}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="#fff" />
          {/* 앞 사진 둘레를 비워 뒤 사진과 겹쳐 보이지 않게 한다 */}
          <rect x="4" y="7.2" width="18" height="14.6" rx="3.4" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <rect
          x="3"
          y="3.6"
          width="15"
          height="13"
          rx="2.6"
          transform="rotate(-11 10.5 10)"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
        />
      </g>
      <g fill="currentColor" stroke="currentColor" strokeLinejoin="round">
        <path
          fillRule="evenodd"
          stroke="none"
          d="M8.1 8.5h9.8a2.6 2.6 0 0 1 2.6 2.6v6.8a2.6 2.6 0 0 1-2.6 2.6H8.1a2.6 2.6 0 0 1-2.6-2.6v-6.8a2.6 2.6 0 0 1 2.6-2.6Zm.4 2a1 1 0 0 0-1 1v6.4a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-6.4a1 1 0 0 0-1-1h-9Z"
        />
        <circle cx="15.6" cy="13.4" r="1.3" stroke="none" />
        <path strokeWidth={1.2} d="M8.7 17.6 11.5 13.8l2.2 2.8 1.3-1.3 2.6 2.3H8.7Z" />
      </g>
    </svg>
  );
}
