import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FilePlus2,
  Gauge,
  LineChart,
  Mail,
  MessageSquareText,
  PlayCircle,
  ShieldQuestion,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

type MarketingPage = NextPage & {
  noAppShell?: boolean;
};

const navItems = [
  { label: "Platform", href: "#platform", hasMenu: true },
  { label: "Solutions", href: "#solutions", hasMenu: true },
  { label: "Use Cases", href: "#use-cases", hasMenu: false },
  { label: "Demo", href: "#demo", hasMenu: false },
  { label: "About", href: "#who-it-helps", hasMenu: false },
];

const solutionGroups = [
  {
    label: "For teams",
    items: [
      {
        title: "Revenue teams",
        copy: "Turn call review into a repeatable coaching rhythm.",
        href: "#workflow",
      },
      {
        title: "Sales enablement",
        copy: "Reinforce discovery, objection handling, and follow-up standards.",
        href: "#solutions",
      },
      {
        title: "Founder-led sales",
        copy: "Convert early sales calls into a clearer playbook.",
        href: "#who-it-helps",
      },
      {
        title: "High-ticket closers",
        copy: "Coach the questions that create urgency without pressure.",
        href: "#use-cases",
      },
    ],
  },
  {
    label: "Use cases",
    items: [
      {
        title: "Discovery coaching",
        copy: "Find whether reps reached real pain, impact, and consequences.",
        href: "#discovery-coaching",
      },
      {
        title: "Objection practice",
        copy: "Separate stated objections from the real buyer concern.",
        href: "#objection-practice",
      },
      {
        title: "Follow-up review",
        copy: "Turn call notes into specific email and SMS follow-up.",
        href: "#follow-up-review",
      },
      {
        title: "Manager scorecards",
        copy: "Give managers a clear view of what to coach next.",
        href: "#manager-scorecards",
      },
    ],
  },
  {
    label: "Buyer psychology",
    items: [
      {
        title: "Pain depth",
        copy: "Show whether the buyer connected the problem to real stakes.",
        href: "#buyer-psychology",
      },
      {
        title: "Urgency",
        copy: "Identify whether the call created a reason to act now.",
        href: "#buyer-psychology",
      },
      {
        title: "Money readiness",
        copy: "Spot weak budget language before the deal stalls.",
        href: "#buyer-psychology",
      },
      {
        title: "Decision clarity",
        copy: "Clarify who decides, what blocks commitment, and what happens next.",
        href: "#buyer-psychology",
      },
    ],
  },
];

const pains = [
  "Reps pitch before the buyer has clearly admitted the cost of staying the same.",
  "Price, timing, and trust objections get handled with defensive explanations.",
  "Managers cannot listen to every call, so coaching happens late or from memory.",
  "Follow-up is generic, which makes warm buyers feel like cold leads again.",
  "High-ticket opportunities stall because urgency, money readiness, and decision path are unclear.",
];

const outcomes = [
  "Know which reps need discovery, objection, closing, or follow-up coaching.",
  "Give sellers better questions to ask on the next live call.",
  "Turn each scorecard into a focused practice drill instead of another dashboard.",
  "Make call feedback specific enough for managers, founders, and closers to act on.",
];

const features = [
  {
    id: "manager-scorecards",
    title: "Call scorecards",
    feature: "Review transcripts and audio against discovery, objection handling, closing, and follow-up categories.",
    benefit: "Managers know exactly what to coach without replaying every call.",
    icon: BarChart3,
  },
  {
    id: "buyer-psychology",
    title: "Sales psychology lens",
    feature: "Score trust, pain depth, urgency, decision clarity, money readiness, and resistance.",
    benefit: "See why a buyer is not moving, not just what the rep said.",
    icon: Brain,
  },
  {
    id: "discovery-coaching",
    title: "Better question coaching",
    feature: "Highlight missed moments and suggest stronger question-led alternatives.",
    benefit: "Help reps create urgency without pushing, over-explaining, or pitching too early.",
    icon: MessageSquareText,
  },
  {
    id: "objection-practice",
    title: "Objection diagnosis",
    feature: "Separate surface objections from the underlying buyer concern.",
    benefit: "Coach reps to lower resistance before asking for a decision.",
    icon: ShieldQuestion,
  },
  {
    id: "follow-up-review",
    title: "Follow-up drafts",
    feature: "Generate email and SMS follow-up tied to the buyer's stated pain, consequence, and next step.",
    benefit: "Reduce ghosting with messages that sound specific to the conversation.",
    icon: Mail,
  },
  {
    id: "practice-lab",
    title: "Practice Lab",
    feature: "Turn scorecard gaps into focused drills for discovery, objections, closing, and follow-up.",
    benefit: "Move from insight to behavior change before the next live call.",
    icon: Target,
  },
];

const useCases = [
  {
    title: "Coach discovery depth",
    pain: "The rep asked what the buyer wanted, but did not uncover why it matters now.",
    outcome: "RevenueCoach suggests consequence, impact, and commitment questions for the next call.",
  },
  {
    title: "Diagnose objection quality",
    pain: "The buyer said it was expensive, and the rep defended price instead of exploring resistance.",
    outcome: "Managers see whether the objection was about trust, timing, money, or decision risk.",
  },
  {
    title: "Improve follow-up",
    pain: "The follow-up message sounded like a template and ignored the buyer's actual stakes.",
    outcome: "The app drafts concise follow-up tied to the call, the pain, and the agreed next step.",
  },
];

const workflow = [
  {
    title: "Capture the call",
    copy: "Paste a transcript or upload audio from a real sales conversation.",
    result: "The call becomes reviewable without requiring a manager to replay everything.",
    icon: FilePlus2,
  },
  {
    title: "Find the revenue leak",
    copy: "Score the call across execution, psychology, objection handling, and follow-up.",
    result: "The team sees the specific moment most likely to slow the deal.",
    icon: Gauge,
  },
  {
    title: "Coach the next move",
    copy: "Turn gaps into better questions, manager notes, and follow-up language.",
    result: "Feedback becomes concrete enough for a rep to use on the next call.",
    icon: ClipboardCheck,
  },
  {
    title: "Practice and verify",
    copy: "Assign drills for discovery, objections, closing, and follow-up.",
    result: "Managers can track whether behavior is changing across calls.",
    icon: CheckCircle2,
  },
];

const buyers = [
  {
    title: "Sales managers",
    copy: "Prioritize the reps, calls, and skills that need coaching this week without listening to every recording.",
  },
  {
    title: "High-ticket closers",
    copy: "Improve pain discovery, money conversations, objection handling, and decision clarity.",
  },
  {
    title: "Founders and operators",
    copy: "Turn early sales conversations into a repeatable coaching system before hiring a full enablement team.",
  },
  {
    title: "Enablement leaders",
    copy: "Reinforce the sales motion with consistent scorecards, practice drills, and manager-ready feedback.",
  },
];

const demoSignals = [
  { label: "Pain depth", value: "58", note: "Buyer named the issue, but not the cost of inaction." },
  { label: "Urgency", value: "61", note: "Timing was discussed, but no consequence was attached." },
  { label: "Decision clarity", value: "47", note: "Decision owner and approval path stayed vague." },
];

const SalesPage: MarketingPage = () => {
  return (
    <>
      <Head>
        <title>RevenueCoach AI | High-Ticket Sales Coaching</title>
        <meta
          name="description"
          content="AI sales coaching for high-ticket revenue teams that turns real calls into manager scorecards, psychology feedback, and practice drills."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="min-h-screen bg-white text-[#08043f]"
        style={{ fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif" }}
      >
        <div className="bg-[#090044] px-4 py-2 text-center text-sm font-semibold text-white">
          Built for high-ticket sales teams that need better discovery, cleaner objections, and follow-up that keeps
          deals moving.
        </div>

        <header className="sticky top-0 z-30 border-b border-[#e7e9f6] bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
            <a href="#platform" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5c67ff] text-white">
                <LineChart className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-3xl font-bold italic text-[#5c67ff]">RevenueCoach</span>
            </a>

            <nav className="hidden items-center gap-9 text-sm font-semibold uppercase text-[#090044] lg:flex">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex h-20 items-center gap-1 border-b-2 ${
                    item.label === "Solutions" ? "border-[#5c67ff] text-[#3d42ff]" : "border-transparent"
                  }`}
                >
                  {item.label}
                  {item.hasMenu ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </a>
              ))}
            </nav>

            <a
              href="#demo"
              className="hidden h-11 items-center justify-center gap-2 rounded-full bg-[#08043f] px-5 text-sm font-bold text-white hover:bg-[#1b1670] sm:inline-flex"
            >
              View demo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </header>

        <main>
          <section className="overflow-hidden border-b border-[#e7e9f6] bg-[#fbfcff]" id="platform">
            <div className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
              <div className="mx-auto max-w-4xl text-center">
                <p className="text-sm font-bold uppercase text-[#1684ff]">AI sales coaching for revenue teams</p>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#090044] sm:text-5xl lg:text-6xl">
                  Coach the conversations that decide high-ticket deals
                </h1>
                <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#312f61]">
                  RevenueCoach AI turns real sales calls into manager-ready scorecards, buyer psychology feedback,
                  better questions, and practice drills so reps know exactly how to improve before the next call.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <a
                    href="#demo"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5c67ff] px-6 text-sm font-bold text-white shadow-[0_16px_35px_rgba(92,103,255,0.28)] hover:bg-[#4752f3]"
                  >
                    See the demo flow
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a
                    href="#solutions"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#bfc6ff] bg-white px-6 text-sm font-bold text-[#090044] hover:border-[#5c67ff]"
                  >
                    <PlayCircle className="h-4 w-4 text-[#5c67ff]" aria-hidden="true" />
                    Explore solutions
                  </a>
                </div>
              </div>

              <div className="mt-12 rounded-lg border border-[#dde2ff] bg-white p-5 shadow-[0_24px_70px_rgba(9,0,68,0.1)]">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
                  <div className="rounded-lg bg-[#090044] p-6 text-white">
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-bold uppercase text-[#9fd3ff]">Recommended next drill</p>
                        <h2 className="mt-2 text-3xl font-extrabold">Discovery depth</h2>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d7dcff]">
                          The buyer named the problem, but the rep did not uncover business impact, personal stakes,
                          or the cost of waiting.
                        </p>
                      </div>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
                        <Sparkles className="h-6 w-6 text-[#9fd3ff]" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {demoSignals.map((signal) => (
                        <div key={signal.label} className="border-t border-white/15 pt-4">
                          <p className="text-xs font-bold uppercase text-[#9fd3ff]">{signal.label}</p>
                          <p className="mt-1 text-3xl font-extrabold text-white">{signal.value}</p>
                          <p className="mt-2 text-xs leading-5 text-[#d7dcff]">{signal.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#e7e9f6] bg-[#fbfcff] p-5">
                    <p className="text-xs font-bold uppercase text-[#1684ff]">Manager move</p>
                    <h3 className="mt-2 text-xl font-extrabold text-[#090044]">Coach one stronger consequence question.</h3>
                    <p className="mt-3 text-sm leading-6 text-[#5a5886]">
                      Ask the rep to slow down before pricing and uncover what happens if the buyer does nothing for
                      the next 90 days.
                    </p>
                    <div className="mt-5 rounded-lg border border-[#dfe4ff] bg-white p-4">
                      <p className="text-xs font-bold uppercase text-[#1684ff]">Better question</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#090044]">
                        "If this is still happening 90 days from now, what does that cost the team?"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white px-5 py-14" id="solutions">
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase text-[#1684ff]">Solutions</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044] sm:text-4xl">
                  Choose the coaching angle that matches the revenue problem.
                </h2>
                <p className="mt-4 text-base leading-7 text-[#4c4a7d]">
                  These are not generic dashboard labels. Each path points to a specific coaching job: who needs help,
                  what kind of call moment to review, and which buyer signal to strengthen.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {solutionGroups.map((column) => (
                  <div key={column.label} className="rounded-lg border border-[#e7e9f6] bg-[#fbfcff] p-5">
                    <p className="text-xs font-bold uppercase text-[#1684ff]">{column.label}</p>
                    <div className="mt-5 space-y-3">
                      {column.items.map((item) => (
                        <a
                          key={item.title}
                          href={item.href}
                          className="group block rounded-lg border border-[#e7e9f6] bg-white p-4 transition hover:border-[#5c67ff] hover:shadow-[0_12px_28px_rgba(92,103,255,0.12)]"
                        >
                          <span className="flex items-center justify-between gap-3 text-sm font-extrabold text-[#090044]">
                            {item.title}
                            <ArrowRight className="h-4 w-4 text-[#5c67ff] transition group-hover:translate-x-1" />
                          </span>
                          <span className="mt-2 block text-sm leading-6 text-[#5a5886]">{item.copy}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#f6f8ff] px-5 py-16" id="use-cases">
            <div className="mx-auto max-w-7xl">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[420px_1fr]">
                <div>
                  <p className="text-sm font-bold uppercase text-[#1684ff]">The problem</p>
                  <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044] sm:text-4xl">
                    Revenue leaks happen inside conversations.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[#4c4a7d]">
                    Most teams already have call recordings. What they lack is a fast, consistent way to translate
                    those calls into coaching that changes the next sales conversation.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {pains.map((pain) => (
                    <div key={pain} className="rounded-lg border border-[#e7e9f6] bg-white p-5">
                      <div className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ff5f7a]" />
                        <p className="text-sm font-semibold leading-6 text-[#312f61]">{pain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {useCases.map((item) => (
                  <div key={item.title} className="rounded-lg border border-[#e1e5fb] bg-white p-6">
                    <h3 className="text-xl font-extrabold text-[#090044]">{item.title}</h3>
                    <p className="mt-4 text-sm font-semibold leading-6 text-[#312f61]">{item.pain}</p>
                    <p className="mt-4 text-sm leading-6 text-[#5a5886]">{item.outcome}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white px-5 py-16">
            <div className="mx-auto max-w-7xl">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <p className="text-sm font-bold uppercase text-[#1684ff]">Features and benefits</p>
                  <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044] sm:text-4xl">
                    Built for coaching that improves revenue behavior.
                  </h2>
                  <div className="mt-6 space-y-3">
                    {outcomes.map((outcome) => (
                      <div key={outcome} className="flex gap-3 text-sm font-semibold leading-6 text-[#312f61]">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#13a884]" aria-hidden="true" />
                        {outcome}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {features.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} id={item.id} className="rounded-lg border border-[#e1e5fb] bg-[#fbfcff] p-6">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eef1ff] text-[#5c67ff]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h3 className="mt-5 text-lg font-extrabold text-[#090044]">{item.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[#5a5886]">{item.feature}</p>
                        <p className="mt-4 text-sm font-bold leading-6 text-[#090044]">{item.benefit}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#f6f8ff] px-5 py-16" id="workflow">
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase text-[#1684ff]">Workflow</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044] sm:text-4xl">
                  From call review to measurable rep improvement.
                </h2>
                <p className="mt-4 text-base leading-7 text-[#4c4a7d]">
                  The workflow is designed around what a sales manager actually needs: a clear diagnosis, a specific
                  coaching move, and a practice loop that can be repeated across the team.
                </p>
              </div>

              <div className="relative mt-10">
                <div className="absolute left-0 right-0 top-8 hidden h-px bg-[#ccd4ff] lg:block" />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                  {workflow.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.title} className="relative rounded-lg border border-[#dfe4ff] bg-white p-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-8 border-[#f6f8ff] bg-[#5c67ff] text-white">
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <p className="mt-6 text-sm font-bold uppercase text-[#1684ff]">Step {index + 1}</p>
                        <h3 className="mt-2 text-xl font-extrabold text-[#090044]">{step.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[#5a5886]">{step.copy}</p>
                        <p className="mt-5 border-t border-[#e7e9f6] pt-4 text-sm font-semibold leading-6 text-[#090044]">
                          {step.result}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white px-5 py-16" id="who-it-helps">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[360px_1fr]">
              <div>
                <p className="text-sm font-bold uppercase text-[#1684ff]">Best fit</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044] sm:text-4xl">
                  Who this helps
                </h2>
                <p className="mt-4 text-base leading-7 text-[#4c4a7d]">
                  RevenueCoach AI is strongest when the team sells considered, high-trust offers where discovery,
                  objection handling, and follow-up quality directly affect close rates.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {buyers.map((buyer) => (
                  <div key={buyer.title} className="rounded-lg border border-[#e7e9f6] bg-[#fbfcff] p-6">
                    <div className="flex items-start gap-3">
                      <Users className="mt-1 h-5 w-5 text-[#5c67ff]" aria-hidden="true" />
                      <div>
                        <p className="font-extrabold text-[#090044]">{buyer.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[#5a5886]">{buyer.copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white px-5 py-16" id="demo">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-lg border border-[#dfe4ff] bg-[#f6f8ff] p-5 shadow-[0_24px_70px_rgba(9,0,68,0.08)] lg:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.78fr_1.22fr]">
                  <div className="flex flex-col justify-between rounded-lg bg-white p-6">
                    <div>
                      <p className="text-sm font-bold uppercase text-[#1684ff]">Guided demo</p>
                      <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044] sm:text-4xl">
                        Watch one call become a coaching plan.
                      </h2>
                      <p className="mt-4 text-base leading-7 text-[#4c4a7d]">
                        The landing-page demo now stays in the same visual system: no app sidebar, no abrupt workspace
                        jump, just the revenue-coaching loop a buyer needs to understand.
                      </p>
                    </div>

                    <div className="mt-8 space-y-3">
                      {[
                        ["1", "Paste call", "Transcript or audio goes in."],
                        ["2", "Read signal", "AI identifies the buyer psychology gap."],
                        ["3", "Coach action", "Manager gets the exact next practice move."],
                      ].map(([step, title, copy]) => (
                        <div key={title} className="flex gap-3 rounded-lg border border-[#e7e9f6] bg-[#fbfcff] p-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5c67ff] text-sm font-extrabold text-white">
                            {step}
                          </span>
                          <span>
                            <span className="block text-sm font-extrabold text-[#090044]">{title}</span>
                            <span className="mt-1 block text-sm leading-6 text-[#5a5886]">{copy}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/calls/new"
                      className="mt-8 inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full bg-[#090044] px-6 text-sm font-bold text-white hover:bg-[#1b1670]"
                    >
                      Open full app workspace
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="rounded-lg bg-white p-5">
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
                      <div className="rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-5">
                        <div className="flex items-start justify-between gap-5">
                          <div>
                            <p className="text-xs font-bold uppercase text-[#1684ff]">Sample call moment</p>
                            <h3 className="mt-2 text-2xl font-extrabold text-[#090044]">Timing objection</h3>
                          </div>
                          <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-xs font-bold uppercase text-[#5c67ff]">
                            Discovery
                          </span>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="rounded-lg border border-[#e7e9f6] bg-white p-4">
                            <p className="text-xs font-bold uppercase text-[#1684ff]">Buyer</p>
                            <p className="mt-2 text-sm leading-6 text-[#312f61]">
                              "We probably need this, but the timing may be hard this quarter."
                            </p>
                          </div>
                          <div className="rounded-lg border border-[#e7e9f6] bg-white p-4">
                            <p className="text-xs font-bold uppercase text-[#1684ff]">Rep</p>
                            <p className="mt-2 text-sm leading-6 text-[#312f61]">
                              "I understand. We can be flexible on rollout and pricing."
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {[
                            ["Pain depth", "58"],
                            ["Urgency", "61"],
                            ["Decision clarity", "47"],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-white p-4">
                              <p className="text-xs font-bold uppercase text-[#5a5886]">{label}</p>
                              <p className="mt-1 text-3xl font-extrabold text-[#090044]">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#090044] p-5 text-white">
                        <p className="text-xs font-bold uppercase text-[#9fd3ff]">AI coaching output</p>
                        <h3 className="mt-2 text-2xl font-extrabold">What to coach next</h3>
                        <div className="mt-6 space-y-5">
                          <div>
                            <p className="text-xs font-bold uppercase text-[#9fd3ff]">Revenue leak</p>
                            <p className="mt-2 text-sm leading-6 text-[#d7dcff]">
                              Timing objection accepted before the rep clarified what delay costs.
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-[#9fd3ff]">Manager move</p>
                            <p className="mt-2 text-sm leading-6 text-[#d7dcff]">
                              Practice one consequence question before talking price or rollout.
                            </p>
                          </div>
                          <div className="rounded-lg bg-white p-4 text-[#090044]">
                            <p className="text-xs font-bold uppercase text-[#1684ff]">Suggested question</p>
                            <p className="mt-2 text-sm font-extrabold leading-6">
                              "What gets harder if this waits until next quarter?"
                            </p>
                          </div>
                          <div className="rounded-lg border border-white/15 p-4">
                            <p className="text-xs font-bold uppercase text-[#9fd3ff]">Practice drill</p>
                            <p className="mt-2 text-sm leading-6 text-[#d7dcff]">
                              Run a 5-minute objection drill focused on cost-of-inaction questions.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

SalesPage.noAppShell = true;

export default SalesPage;
