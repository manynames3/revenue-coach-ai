import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Gauge,
  LineChart,
  MessageSquareText,
  PlayCircle,
  Sparkles,
  Target,
} from "lucide-react";

type DemoPageType = NextPage & {
  noAppShell?: boolean;
};

const steps = [
  {
    label: "Submit the call",
    copy: "Paste a transcript or upload audio from a real sales conversation.",
    icon: FilePlus2,
  },
  {
    label: "Read the buyer signal",
    copy: "RevenueCoach scores the conversation for pain, urgency, resistance, money, and decision clarity.",
    icon: Gauge,
  },
  {
    label: "Coach the next rep move",
    copy: "Managers get better questions, follow-up language, and a drill tied to the next call.",
    icon: ClipboardCheck,
  },
];

const scoreSignals = [
  ["Pain depth", "58", "Buyer named the issue, but not the business cost."],
  ["Urgency", "61", "Timing was discussed without a consequence."],
  ["Decision clarity", "47", "Decision owner and approval path stayed vague."],
];

const managerOutputs = [
  {
    title: "Scorecard",
    copy: "A concise view of the call categories that help or hurt the deal.",
    icon: BarChart3,
  },
  {
    title: "Buyer psychology",
    copy: "Signals for trust, resistance, urgency, money readiness, and emotional driver.",
    icon: Brain,
  },
  {
    title: "Practice drill",
    copy: "A focused drill the manager can assign before the next high-stakes conversation.",
    icon: Target,
  },
  {
    title: "Follow-up coaching",
    copy: "Call-specific follow-up language anchored to the buyer's stated pain and next step.",
    icon: MessageSquareText,
  },
];

const DemoPage: DemoPageType = () => {
  return (
    <>
      <Head>
        <title>RevenueCoach AI Demo | Sales Call Coaching Walkthrough</title>
        <meta
          name="description"
          content="See how RevenueCoach AI turns a high-ticket sales call into scorecards, buyer psychology feedback, manager actions, and practice drills."
        />
      </Head>

      <div className="min-h-screen bg-white text-[#08043f]">
        <div className="bg-[#090044] px-4 py-2 text-center text-sm font-semibold text-white">
          Guided product walkthrough for high-ticket sales teams.
        </div>

        <header className="sticky top-0 z-30 border-b border-[#e7e9f6] bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
            <Link href="/sales" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5c67ff] text-white">
                <LineChart className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-3xl font-bold italic text-[#5c67ff]">RevenueCoach</span>
            </Link>

            <nav className="hidden items-center gap-9 text-sm font-semibold uppercase text-[#090044] lg:flex">
              <a href="/sales#platform" className="flex h-20 items-center border-b-2 border-transparent">
                Platform
              </a>
              <a href="/sales#solutions" className="flex h-20 items-center border-b-2 border-transparent">
                Solutions
              </a>
              <a href="/sales#use-cases" className="flex h-20 items-center border-b-2 border-transparent">
                Use cases
              </a>
              <a href="/demo" className="flex h-20 items-center border-b-2 border-[#5c67ff] text-[#3d42ff]">
                Demo
              </a>
              <a href="/sales#who-it-helps" className="flex h-20 items-center border-b-2 border-transparent">
                About
              </a>
            </nav>

            <Link
              href="/calls/new"
              className="hidden h-11 items-center justify-center gap-2 rounded-full bg-[#08043f] px-5 text-sm font-bold text-white hover:bg-[#1b1670] sm:inline-flex"
            >
              Open workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main>
          <section className="overflow-hidden border-b border-[#e7e9f6] bg-[#fbfcff] px-5 py-16 lg:py-20">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase text-[#1684ff]">Interactive demo</p>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#090044] sm:text-5xl">
                  See one sales call become a coaching plan.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[#312f61]">
                  This walkthrough shows the product story without dropping into the admin workspace too early: the call
                  moment, the buyer psychology signal, and the manager action that improves the next conversation.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#walkthrough"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5c67ff] px-6 text-sm font-bold text-white shadow-[0_16px_35px_rgba(92,103,255,0.28)] hover:bg-[#4752f3]"
                  >
                    Watch walkthrough
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <Link
                    href="/sales#solutions"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#bfc6ff] bg-white px-6 text-sm font-bold text-[#090044] hover:border-[#5c67ff]"
                  >
                    View sales page
                    <ArrowRight className="h-4 w-4 text-[#5c67ff]" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-[#dfe4ff] bg-white p-5 shadow-[0_24px_70px_rgba(9,0,68,0.1)]">
                <div className="rounded-lg bg-[#090044] p-6 text-white">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-bold uppercase text-[#9fd3ff]">Sample scorecard result</p>
                      <h2 className="mt-2 text-3xl font-extrabold">Discovery depth needs coaching</h2>
                    </div>
                    <Sparkles className="h-7 w-7 text-[#9fd3ff]" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#d7dcff]">
                    The rep acknowledged timing pressure, but did not explore what delay would cost the buyer.
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {scoreSignals.map(([label, value, note]) => (
                      <div key={label} className="rounded-lg border border-white/15 bg-white/5 p-4">
                        <p className="text-xs font-bold uppercase text-[#9fd3ff]">{label}</p>
                        <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
                        <p className="mt-2 text-xs leading-5 text-[#d7dcff]">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white px-5 py-16" id="walkthrough">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-lg border border-[#dfe4ff] bg-[#f6f8ff] p-5 shadow-[0_24px_70px_rgba(9,0,68,0.08)] lg:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.72fr_1.28fr]">
                  <div className="rounded-lg bg-white p-6">
                    <p className="text-sm font-bold uppercase text-[#1684ff]">Revenue coaching loop</p>
                    <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044]">
                      What a manager sees before coaching the rep.
                    </h2>
                    <div className="mt-8 space-y-3">
                      {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.label} className="flex gap-3 rounded-lg border border-[#e7e9f6] bg-[#fbfcff] p-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5c67ff] text-sm font-extrabold text-white">
                              {index + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-sm font-extrabold text-[#090044]">
                                <Icon className="h-4 w-4 text-[#5c67ff]" aria-hidden="true" />
                                {step.label}
                              </span>
                              <span className="mt-1 block text-sm leading-6 text-[#5a5886]">{step.copy}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-5">
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
                      <div className="rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-5">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div>
                            <p className="text-xs font-bold uppercase text-[#1684ff]">Call moment</p>
                            <h3 className="mt-2 text-2xl font-extrabold text-[#090044]">Timing objection</h3>
                          </div>
                          <span className="w-fit rounded-full bg-[#eef1ff] px-3 py-1 text-xs font-bold uppercase text-[#5c67ff]">
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
                          {scoreSignals.map(([label, value]) => (
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
                              The timing objection was accepted before the rep clarified what delay costs.
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-[#9fd3ff]">Manager move</p>
                            <p className="mt-2 text-sm leading-6 text-[#d7dcff]">
                              Practice one consequence question before discussing price, rollout, or flexibility.
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

          <section className="bg-[#f6f8ff] px-5 py-16">
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase text-[#1684ff]">Manager-ready output</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#090044] sm:text-4xl">
                  The demo explains the product before the workspace asks for data.
                </h2>
                <p className="mt-4 text-base leading-7 text-[#4c4a7d]">
                  Buyers can understand the value first, then open the full workspace when they are ready to inspect
                  the working call intake, scorecards, and practice lab.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {managerOutputs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-lg border border-[#e1e5fb] bg-white p-6">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eef1ff] text-[#5c67ff]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-5 text-lg font-extrabold text-[#090044]">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#5a5886]">{item.copy}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="bg-white px-5 py-14">
            <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 rounded-lg border border-[#dfe4ff] bg-[#090044] p-6 text-white md:flex-row md:items-center lg:p-8">
              <div>
                <p className="text-sm font-bold uppercase text-[#9fd3ff]">Ready for the product workspace</p>
                <h2 className="mt-2 text-3xl font-extrabold">Open the app to add a real sales conversation.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d7dcff]">
                  The workspace now uses the same brand colors and typography so the transition from sales page to demo
                  to product review feels intentional.
                </p>
              </div>
              <Link
                href="/calls/new"
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#090044] hover:bg-[#eef1ff]"
              >
                Open full app workspace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

DemoPage.noAppShell = true;

export default DemoPage;
