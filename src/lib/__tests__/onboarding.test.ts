import { beforeEach, describe, expect, it, vi } from "vitest";

const trackBoth = vi.fn();
vi.mock("../analytics", () => ({ trackBoth }));

/** 브라우저 한 대: localStorage는 방문 사이에 유지되고, 모듈 상태(메모리)는 페이지를 열 때마다 새로 시작한다. */
function browser() {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  return data;
}

/** 페이지를 새로 연다. (모듈 메모리 초기화, 저장소는 유지) */
async function openPage() {
  vi.resetModules();
  return import("../onboarding");
}

/** 시작 화면 마운트. StrictMode처럼 effect를 두 번 실행해도 되는지 확인하려고 times를 받는다. */
function mountStart(m: typeof import("../onboarding"), times = 1) {
  for (let i = 0; i < times; i++) m.trackOnboardingStarted();
}

/** 시작하기 클릭 → 홈 마운트(HomeScreen의 layout effect와 같은 순서) */
function clickStartThenHome(m: typeof import("../onboarding"), layoutEffects = 1) {
  m.completeOnboarding();
  m.startOnboardingExit();
  for (let i = 0; i < layoutEffects; i++) {
    if (m.consumeArrivalFromOnboarding()) m.trackOnboardingCompleted();
  }
}

const events = () => trackBoth.mock.calls.map(([name]) => name);

beforeEach(() => {
  trackBoth.mockClear();
  browser();
});

describe("시작 화면 이벤트", () => {
  it("신규 사용자 첫 방문: Started 한 번 (StrictMode로 effect가 두 번 돌아도)", async () => {
    const m = await openPage();
    mountStart(m, 2);
    expect(events()).toEqual(["Onboarding Started"]);
    expect(trackBoth).toHaveBeenCalledWith("Onboarding Started");
  });

  it("이탈 후 재방문: 시작 화면은 다시 보이고 Started는 다시 보내지 않으며 Completed도 없다", async () => {
    let m = await openPage();
    mountStart(m);
    expect(m.isOnboarded()).toBe(false);

    m = await openPage(); // 시작하기를 누르지 않고 닫은 뒤 다시 열기
    expect(m.isOnboarded()).toBe(false); // 게이트가 시작 화면을 다시 보여준다
    mountStart(m);
    expect(events()).toEqual(["Onboarding Started"]);
  });

  it("시작하기 후 홈 진입: Completed 한 번 (홈 layout effect가 두 번 돌아도)", async () => {
    const m = await openPage();
    mountStart(m, 2);
    clickStartThenHome(m, 2);
    expect(events()).toEqual(["Onboarding Started", "Onboarding Completed"]);
    expect(m.isOnboarded()).toBe(true);
  });

  it("시작하기를 연속으로 눌러도 Completed는 한 번", async () => {
    const m = await openPage();
    mountStart(m);
    m.completeOnboarding();
    m.completeOnboarding();
    m.startOnboardingExit();
    m.startOnboardingExit();
    if (m.consumeArrivalFromOnboarding()) m.trackOnboardingCompleted();
    m.trackOnboardingCompleted();
    expect(events()).toEqual(["Onboarding Started", "Onboarding Completed"]);
  });

  it("완료한 사용자의 재방문: 시작 화면을 건너뛰고 아무 이벤트도 없다", async () => {
    let m = await openPage();
    mountStart(m);
    clickStartThenHome(m);
    trackBoth.mockClear();

    m = await openPage();
    expect(m.isOnboarded()).toBe(true);
    mountStart(m); // /onboarding을 직접 열어도
    clickStartThenHome(m);
    expect(events()).toEqual([]);
  });

  it("이전에 사용한 사용자(저장 데이터 있음)는 Started·Completed 모두 보내지 않는다", async () => {
    const data = browser();
    data.set("keepnote:v1:notes", "[]");
    const m = await openPage();
    expect(m.isOnboarded()).toBe(true);
    mountStart(m);
    clickStartThenHome(m);
    expect(events()).toEqual([]);
  });

  it("Started 기록이 없으면 Completed를 보내지 않는다", async () => {
    const m = await openPage();
    clickStartThenHome(m);
    expect(events()).toEqual([]);
  });

  it("이탈 후 재방문해서 시작하기를 누르면 Completed만 보낸다 (Started는 첫 노출 때 이미 기록)", async () => {
    let m = await openPage();
    mountStart(m);
    m = await openPage();
    mountStart(m);
    clickStartThenHome(m);
    expect(events()).toEqual(["Onboarding Started", "Onboarding Completed"]);
  });

  it("localStorage를 쓸 수 없어도 같은 방문에서는 중복 없이 한 번씩", async () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        throw new Error("blocked");
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    const m = await openPage();
    mountStart(m, 2);
    clickStartThenHome(m, 2);
    expect(events()).toEqual(["Onboarding Started", "Onboarding Completed"]);
  });
});

/** 화면 하나(마운트 하나)가 받는 onboarded 값의 흐름을 그대로 흘려 보낸다. effect 재실행은 같은 값을 다시 넣어 흉내 낸다. */
function mountHome(m: typeof import("../onboarding"), ...values: (boolean | null)[]) {
  const report = m.createHomeViewedReporter();
  values.forEach((value) => report(value));
}

describe("Home Viewed", () => {
  it("신규 사용자: 시작 화면으로 넘어가는 동안은 기록하지 않고, 시작하기 후 홈 진입에서 1회", async () => {
    const m = await openPage();
    // 첫 방문 "/": 하이드레이션(null) → 게이트 판단(false) 동안 홈이 잠깐 마운트된다.
    mountHome(m, null, false, false);
    expect(events()).toEqual([]);

    mountStart(m, 2);
    // 시작하기 → 새로 마운트된 홈. Completed(layout effect)가 먼저, Home Viewed(effect)가 뒤.
    m.completeOnboarding();
    m.startOnboardingExit();
    if (m.consumeArrivalFromOnboarding()) m.trackOnboardingCompleted();
    mountHome(m, m.isOnboarded());
    expect(events()).toEqual(["Onboarding Started", "Onboarding Completed", "Home Viewed"]);
  });

  it("신규 사용자가 시작 화면에서 이탈하고 다시 와도 홈 기록은 없다", async () => {
    let m = await openPage();
    mountHome(m, null, false);
    mountStart(m);
    m = await openPage();
    mountHome(m, null, false);
    expect(events()).toEqual(["Onboarding Started"]);
  });

  it("기존 사용자 재방문: 홈에 들어올 때마다 1회 (effect 재실행·StrictMode 중복 없음)", async () => {
    const data = browser();
    data.set("keepnote:onboarded", "1");

    // 앱 열기: 하이드레이션(null) 뒤 true. effect가 두 번 돌아도 1회
    let m = await openPage();
    mountHome(m, null, true, true, true);
    expect(events()).toEqual(["Home Viewed"]);

    // 새로고침: 새 페이지, 새 홈 → 1회 더
    m = await openPage();
    mountHome(m, null, true);
    expect(events()).toEqual(["Home Viewed", "Home Viewed"]);

    // 같은 페이지에서 다른 화면에 다녀온 뒤 홈으로 이동: 새로 마운트되므로 1회 더 (기존 정책)
    mountHome(m, true);
    expect(events()).toEqual(["Home Viewed", "Home Viewed", "Home Viewed"]);
    expect(trackBoth).not.toHaveBeenCalledWith("Onboarding Started");
    expect(trackBoth).not.toHaveBeenCalledWith("Onboarding Completed");
  });

  it("시작하기를 연속으로 눌러도 홈 기록은 1회, 이전에 사용한 사용자(저장 데이터)도 기록된다", async () => {
    let m = await openPage();
    mountStart(m);
    m.completeOnboarding();
    m.completeOnboarding();
    mountHome(m, m.isOnboarded(), m.isOnboarded());
    expect(events().filter((name) => name === "Home Viewed")).toHaveLength(1);

    trackBoth.mockClear();
    const data = browser();
    data.set("keepnote:v1:notes", "[]");
    m = await openPage();
    mountHome(m, null, m.isOnboarded());
    expect(events()).toEqual(["Home Viewed"]);
  });
});
