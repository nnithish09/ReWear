import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, CheckCircle2, Gift, Layers, Plus, Shirt, Trash2 } from 'lucide-react';
import Avatar from '../components/Avatar';
import ClothingCard from '../components/ClothingCard';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { useWardrobe } from '../hooks/useWardrobe';
import { CHART_COLORS } from '../utils/constants';
import { getFirestoreErrorMessage } from '../utils/firebaseErrors';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { displayName, photoURL } = useAuth();
  const { items, loading, error, stats } = useWardrobe();
  const firstName = displayName.split(' ')[0];
  const recent = items.slice(0, 4);
  const maxCount = stats.categoryCounts[0]?.value || 1;

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} photoURL={photoURL} size={56} />
          <div>
            <p className="text-sm text-muted">{greeting()}</p>
            <h1 className="text-3xl">Welcome, {firstName}</h1>
          </div>
        </div>
        <Link to="/wardrobe/add" className="btn-primary">
          <Plus className="h-4 w-4" /> Quick add clothing
        </Link>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-blush bg-blush-soft px-4 py-3 text-sm text-[#8A4B45]">
          We couldn't load your wardrobe: {getFirestoreErrorMessage(error)}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading ? (
          <LoadingSkeleton variant="stat" count={5} />
        ) : (
          <>
            <StatCard label="Total items" value={stats.total} icon={Shirt} tone="clay" />
            <StatCard label="Available" value={stats.available} icon={CheckCircle2} tone="sage" />
            <StatCard label="Donated" value={stats.donated} icon={Gift} tone="mist" />
            <StatCard label="Discarded" value={stats.discarded} icon={Trash2} tone="blush" />
            <StatCard label="Categories" value={stats.categories} icon={Layers} tone="butter" />
          </>
        )}
      </section>

      {!loading && !error && stats.total === 0 ? (
        <EmptyState />
      ) : (
        !loading && (
          <>
            <section className="grid gap-6 lg:grid-cols-5">
              <div className="card p-6 lg:col-span-3">
                <h2 className="text-xl">Clothing distribution</h2>
                <p className="text-sm text-muted">Items per category in your wardrobe</p>
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryCounts}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {stats.categoryCounts.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} item${value === 1 ? '' : 's'}`, name]}
                        contentStyle={{ borderRadius: 12, border: '1px solid #E3DACB', fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-6 lg:col-span-2">
                <h2 className="text-xl">By category</h2>
                <p className="mb-4 text-sm text-muted">Where your wardrobe is concentrated</p>
                <ul className="space-y-3">
                  {stats.categoryCounts.map((entry, index) => (
                    <li key={entry.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          {entry.name}
                        </span>
                        <span className="font-medium">{entry.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-sand/70">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(entry.value / maxCount) * 100}%`,
                            background: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl">Recently added</h2>
                  <p className="text-sm text-muted">Your latest wardrobe additions</p>
                </div>
                <Link to="/wardrobe" className="btn-ghost !px-2 text-sm">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {recent.map((item) => (
                  <ClothingCard key={item.id} item={item} view="grid" />
                ))}
              </div>
            </section>
          </>
        )
      )}
    </div>
  );
}
