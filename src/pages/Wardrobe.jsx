import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, Plus, SearchX } from 'lucide-react';
import toast from 'react-hot-toast';
import ClothingCard from '../components/ClothingCard';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import FilterPanel from '../components/FilterPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../hooks/useAuth';
import { useWardrobe } from '../hooks/useWardrobe';
import { deleteClothing } from '../services/clothingService';
import { getFirestoreErrorMessage } from '../utils/firebaseErrors';

const DEFAULT_FILTERS = { category: 'All', color: 'All', occasion: 'All', status: 'All', sort: 'newest' };

export default function Wardrobe() {
  const { user } = useAuth();
  const { items, loading, error } = useWardrobe();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [view, setView] = useState('grid');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Colour filter options come from what the user actually owns.
  const colorOptions = useMemo(
    () => [...new Set(items.map((item) => item.color).filter(Boolean))].sort(),
    [items]
  );

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (term && !`${item.itemName} ${item.brand}`.toLowerCase().includes(term)) return false;
      if (filters.category !== 'All' && item.category !== filters.category) return false;
      if (filters.color !== 'All' && item.color !== filters.color) return false;
      if (filters.occasion !== 'All' && item.occasion !== filters.occasion) return false;
      if (filters.status !== 'All' && item.status !== filters.status) return false;
      return true;
    });
    const time = (item) => (item.createdAt ? item.createdAt.getTime() : 0);
    return filtered.sort((a, b) => (filters.sort === 'oldest' ? time(a) - time(b) : time(b) - time(a)));
  }, [items, search, filters]);

  const hasActiveFilters =
    search.trim() !== '' ||
    Object.entries(DEFAULT_FILTERS).some(([key, defaultValue]) => filters[key] !== defaultValue);

  const resetFilters = () => {
    setSearch('');
    setFilters(DEFAULT_FILTERS);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteClothing(user.uid, pendingDelete.id);
      toast.success(`"${pendingDelete.itemName}" was deleted.`);
      setPendingDelete(null); // the live listener removes it from the list
    } catch (deleteError) {
      toast.error(`Could not delete the item: ${getFirestoreErrorMessage(deleteError)}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">My Wardrobe</h1>
          <p className="text-sm text-muted">
            {loading
              ? 'Loading your clothes…'
              : `${visibleItems.length} of ${items.length} item${items.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link to="/wardrobe/add" className="btn-primary">
          <Plus className="h-4 w-4" /> Add clothing
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-blush bg-blush-soft px-4 py-3 text-sm text-[#8A4B45]">
          We couldn't load your wardrobe: {getFirestoreErrorMessage(error)}
        </div>
      )}

      {(loading || items.length > 0) && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <div className="flex rounded-xl border border-line bg-white p-1" role="group" aria-label="View mode">
              {[
                { mode: 'grid', icon: LayoutGrid, label: 'Grid view' },
                { mode: 'list', icon: List, label: 'List view' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  aria-label={label}
                  aria-pressed={view === mode}
                  className={`rounded-lg p-2 transition ${
                    view === mode ? 'bg-ink text-canvas' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <FilterPanel
            filters={filters}
            onChange={setFilters}
            colorOptions={colorOptions}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </>
      )}

      {loading ? (
        <LoadingSkeleton view={view} />
      ) : items.length === 0 ? (
        !error && <EmptyState />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching items"
          message="Nothing in your wardrobe matches the current search and filters."
          actionLabel={null}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <ClothingCard key={item.id} item={item} view="grid" onDelete={setPendingDelete} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <ClothingCard key={item.id} item={item} view="list" onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && visibleItems.length === 0 && hasActiveFilters && (
        <div className="text-center">
          <button onClick={resetFilters} className="btn-secondary">
            Clear search and filters
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this item?"
        message={`"${pendingDelete?.itemName ?? ''}" will be permanently removed from your wardrobe. This can't be undone.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
