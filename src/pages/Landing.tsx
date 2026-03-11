import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Shield, MapPin, ArrowRight, HeartPulse, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const { language } = useLanguage();

  const statCards = [
    {
      badge: 'Undiagnosed Risk',
      value: '33%',
      desc: 'of rural Bangladeshis are at risk but unaware',
      badgeClass: 'bg-orange-50 text-orange-600',
    },
    {
      badge: 'Higher Female Risk',
      value: '25.3%',
      desc: 'prevalence in females vs 20.3% in males',
      badgeClass: 'bg-pink-50 text-pink-600',
    },
    {
      badge: 'Age Factor',
      value: '40+',
      desc: 'years dramatically increases CKD progression',
      badgeClass: 'bg-blue-50 text-blue-600',
    },
  ];

  const features = [
    {
      icon: Activity,
      title: 'Smart GFR Calculator',
      desc: 'Side-by-side comparison of MDRD, CG, and CKD-EPI formulas.',
    },
    {
      icon: Shield,
      title: 'Risk Scoring Engine',
      desc: 'Early detection based on local research risk factors.',
    },
    {
      icon: MapPin,
      title: 'National Heatmap',
      desc: 'District-level CKD burden visualization for policymakers.',
    },
    {
      icon: AlertCircle,
      title: 'Decision Support',
      desc: 'AI-driven clinical alerts for doctors to prevent ESRD.',
    },
  ];

  return (
    <div className="space-y-20 pb-10">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(26,107,138,0.10),_transparent_36%),linear-gradient(180deg,#f8fbff_0%,#f4f7fb_100%)] px-6 py-10 md:px-12 md:py-16">
        <div className="absolute -left-10 top-12 h-40 w-40 rounded-full bg-[#1A6B8A]/5 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-slate-300/20 blur-3xl" />

        <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A6B8A]/10 px-4 py-2 text-sm font-bold text-[#1A6B8A]"
            >
              <HeartPulse className="h-4 w-4" />
              {language === 'en' ? 'Bangladesh CKD Monitoring Platform' : 'বাংলাদেশ সিকেডি মনিটরিং প্ল্যাটফর্ম'}
            </motion.div>

            <div className="space-y-5">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="max-w-4xl text-4xl font-black leading-tight text-slate-950 md:text-6xl"
              >
                Early CKD Detection, Monitoring, and Smarter Care for Bangladesh.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-2xl text-lg leading-8 text-slate-600 md:text-xl"
              >
                KidneyCare BD helps patients, doctors, and public health teams track kidney risk,
                compare GFR formulas, monitor district-level burden, and act earlier before CKD becomes critical.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-wrap gap-4"
            >
              <button
                onClick={onStart}
                className="inline-flex min-w-[264px] items-center justify-center gap-3 rounded-[20px] bg-[#1A6B8A] px-8 py-5 text-xl font-black text-white shadow-xl shadow-[#1A6B8A]/20 transition-all hover:bg-[#14556e]"
              >
                Get Started Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => document.getElementById('care-features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex min-w-[184px] items-center justify-center rounded-[20px] border border-slate-200 bg-white px-8 py-5 text-xl font-black text-slate-800 transition-all hover:bg-slate-50"
              >
                Learn More
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500"
            >
              <span>22.48% CKD prevalence in Bangladesh</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
              <span>Built for patient, doctor, and policy workflows</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
              <button onClick={onLogin} className="font-bold text-[#1A6B8A] hover:underline">
                Already have an account? Login
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-[#1A6B8A] p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">Live Risk</p>
                  <p className="mt-4 text-5xl font-black">68</p>
                  <p className="mt-2 text-sm font-medium text-white/80">High risk patient cohort</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Detected Early</p>
                  <p className="mt-4 text-4xl font-black text-slate-900">1 in 3</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">rural cases can be flagged sooner</p>
                </div>
                <div className="col-span-2 rounded-3xl border border-slate-100 bg-slate-50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">CKD Monitoring Snapshot</p>
                      <p className="mt-1 text-sm text-slate-500">Integrated patient, doctor, and public health dashboard</p>
                    </div>
                    <div className="rounded-2xl bg-[#1A6B8A]/10 p-3 text-[#1A6B8A]">
                      <Activity className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Risk-screened population</span>
                        <span>78%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[78%] rounded-full bg-[#1A6B8A]" />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Follow-up adherence</span>
                        <span>61%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[61%] rounded-full bg-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Doctor alerts reviewed</span>
                        <span>84%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[84%] rounded-full bg-orange-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {statCards.map((card, index) => (
          <motion.div
            key={card.badge}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="rounded-[30px] border border-slate-200 bg-white px-9 py-10 shadow-sm"
          >
            <div className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${card.badgeClass}`}>
              {card.badge}
            </div>
            <p className="mt-7 text-5xl font-black text-slate-950">{card.value}</p>
            <p className="mt-4 max-w-xs text-[28px] leading-8 text-slate-600 md:text-[18px] md:leading-9">
              {card.desc}
            </p>
          </motion.div>
        ))}
      </section>

      <section id="care-features" className="space-y-8 pt-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-black text-slate-950 md:text-6xl">Comprehensive Care Features</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-slate-500">
            Built specifically for the Bangladesh healthcare context, addressing the unique challenges of CKD monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-[30px] border border-slate-200 bg-white p-9 shadow-sm"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1A6B8A] text-white">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-9 text-[32px] font-black leading-tight text-slate-950 md:text-[20px]">
                {feature.title}
              </h3>
              <p className="mt-4 text-[26px] leading-9 text-slate-500 md:text-[16px] md:leading-8">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
