const TONES = {
  clay: 'bg-clay-soft text-clay-dark',
  sage: 'bg-sage-soft text-[#4C6648]',
  mist: 'bg-mist-soft text-[#3F5F73]',
  blush: 'bg-blush-soft text-[#8A4B45]',
  butter: 'bg-butter-soft text-[#7A6522]',
};

export default function StatCard({ label, value, icon: Icon, tone = 'clay' }) {
  return (
    <div className="card p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </div>
  );
}
