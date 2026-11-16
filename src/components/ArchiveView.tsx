import React, { useMemo, useState } from 'react';
import { BookOpen, Calendar, Camera, Plus, Search, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { compressImageToDataUrl, getInitials } from '../lib/imageUtils';
import { FamilyMember } from '../types/family';

interface ArchiveViewProps {
  onSelectMember: (member: FamilyMember) => void;
}

type ArchiveTab = 'directory' | 'gallery' | 'stories' | 'events';

export const ArchiveView: React.FC<ArchiveViewProps> = ({ onSelectMember }) => {
  const { user, isAdmin, branches, members, stories, gallery, events, addStory, addPhoto, addEvent, deleteArchiveItem } =
    useAuth();

  const [tab, setTab] = useState<ArchiveTab>('directory');
  const [branchFilter, setBranchFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [eraYear, setEraYear] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [eventType, setEventType] = useState<'announcement' | 'reunion' | 'milestone' | 'memorial'>('reunion');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (branchFilter && m.branchId !== branchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.branchName.toLowerCase().includes(q) ||
          m.biography.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, branchFilter, searchQuery]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, maxBytes: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressImageToDataUrl(file, 760, maxBytes);
      setImageUrl(dataUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to process photo.');
    }
  };

  const resetForms = () => {
    setShowForm(false);
    setTitle('');
    setEraYear('');
    setContent('');
    setImageUrl('');
    setEventDate('');
    setLocation('');
    setError('');
  };

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await addStory({
        title,
        eraYear,
        branchId: formBranchId || branches[0]?.id || '',
        content,
        coverImageUrl: imageUrl,
      });
      resetForms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish story.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setError('Please select a photograph to upload.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await addPhoto({
        title,
        caption: content,
        yearTaken: eraYear,
        branchId: formBranchId || branches[0]?.id || '',
        imageUrl,
      });
      resetForms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await addEvent({
        title,
        eventType,
        eventDate,
        location,
        description: content,
        branchId: formBranchId || branches[0]?.id || '',
      });
      resetForms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4 dark:border-[#1E3252]">
        <div>
          <p className="text-xs font-medium text-[#9A7214] dark:text-[#D4AF37]">
            Shared Heritage Memory Bank
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
            Family Archive &amp; Directory
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[#F1F4F9] p-1 dark:bg-[#0F1D33]">
            {[
              { id: 'directory', label: 'Members Directory', icon: Users },
              { id: 'gallery', label: 'Photo Gallery', icon: Camera },
              { id: 'stories', label: 'History & Stories', icon: BookOpen },
              { id: 'events', label: 'Events & Notices', icon: Calendar },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id as ArchiveTab);
                    resetForms();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    tab === item.id
                      ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#D4AF37]'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {tab !== 'directory' && (
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-3.5 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {tab === 'gallery' ? 'Add Photo' : tab === 'stories' ? 'Write Story' : 'Post Event'}
            </button>
          )}
        </div>
      </div>

      {/* Add Forms */}
      {showForm && tab !== 'directory' && (
        <form
          onSubmit={
            tab === 'stories' ? handleSubmitStory : tab === 'gallery' ? handleSubmitPhoto : handleSubmitEvent
          }
          className="space-y-4 rounded-xl border border-[#C99A2E]/50 bg-white p-5 dark:border-[#D4AF37]/40 dark:bg-[#0F1D33]"
        >
          <h2 className="font-display text-lg font-semibold">
            {tab === 'gallery'
              ? 'Upload Family Photograph'
              : tab === 'stories'
                ? 'Publish Family History Story'
                : 'Post Family Event or Announcement'}
          </h2>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
            />
            {tab === 'events' ? (
              <>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as typeof eventType)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="announcement">Announcement</option>
                  <option value="reunion">Family Reunion</option>
                  <option value="milestone">Milestone</option>
                  <option value="memorial">Memorial</option>
                </select>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={eraYear}
                  onChange={(e) => setEraYear(e.target.value)}
                  placeholder="Year or Era (e.g. 1978)"
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                />
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {tab === 'events' && (
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location or Virtual Link Details"
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
            />
          )}

          {tab !== 'events' && (
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadImage(e, tab === 'gallery' ? 280000 : 180000)}
                className="text-xs"
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="h-12 w-16 rounded object-cover"
                />
              )}
            </div>
          )}

          <textarea
            rows={3}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              tab === 'gallery'
                ? 'Caption or people pictured...'
                : tab === 'stories'
                  ? 'Write the family memory or historical account...'
                  : 'Event or announcement details...'
            }
            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForms}
              className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium dark:border-[#1E3252] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: Directory Search & Filter */}
      {tab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search verified members by name, branch, or biography..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-sm dark:border-[#1E3252] dark:bg-[#0F1D33]"
              />
            </div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#0F1D33]"
            >
              <option value="">All Family Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#64748B] dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#94A3B8]">
              No verified family members match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMember(m)}
                  className="flex items-start gap-3.5 rounded-xl border border-[#E2E8F0] bg-white p-4 text-left hover:border-[#C99A2E] dark:border-[#1E3252] dark:bg-[#0F1D33] dark:hover:border-[#D4AF37] cursor-pointer"
                >
                  {m.photoUrl ? (
                    <img
                      src={m.photoUrl}
                      alt={m.fullName}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0F2342] font-display text-sm font-semibold text-[#D4AF37]">
                      {getInitials(m.fullName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#0F2342] dark:text-[#F8FAFC]">{m.fullName}</p>
                    <p className="text-xs text-[#9A7214] dark:text-[#D4AF37]">
                      Gen {m.generation} · {m.branchName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {m.biography || `Born ${m.dateOfBirth || 'Date unrecorded'}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Photo Gallery */}
      {tab === 'gallery' && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.length === 0 ? (
            <div className="col-span-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-white dark:border-[#1E3252] dark:bg-[#0F1D33]">
              <img
                src="/src/assets/images/gallery_reunion_courtyard_1794849068426.jpg"
                alt="Family courtyard reunion archive"
                referrerPolicy="no-referrer"
                className="h-56 w-full object-cover"
              />
              <div className="p-6 text-center">
                <p className="font-display text-lg font-semibold">Family Photo Gallery</p>
                <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No family photographs uploaded yet. Click Add Photo above to preserve your first memory.
                </p>
              </div>
            </div>
          ) : (
            gallery.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white dark:border-[#1E3252] dark:bg-[#0F1D33]"
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">{photo.title}</p>
                      <p className="text-[11px] text-[#9A7214] dark:text-[#D4AF37]">
                        {photo.yearTaken || 'Undated'} · By {photo.uploadedByName}
                      </p>
                    </div>
                    {(isAdmin || photo.uploadedByUid === user?.uid) && (
                      <button
                        type="button"
                        onClick={() => void deleteArchiveItem('gallery', photo.id)}
                        className="p-1 text-[#94A3B8] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {photo.caption && (
                    <p className="mt-2 text-xs text-[#475569] dark:text-[#CBD5E1]">{photo.caption}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Stories */}
      {tab === 'stories' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {stories.length === 0 ? (
            <div className="col-span-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-white dark:border-[#1E3252] dark:bg-[#0F1D33]">
              <img
                src="/src/assets/images/story_founding_archive_1794849067579.jpg"
                alt="Family chronicle archive"
                referrerPolicy="no-referrer"
                className="h-52 w-full object-cover"
              />
              <div className="p-6 text-center">
                <p className="font-display text-lg font-semibold">Family History &amp; Chronicles</p>
                <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No stories published yet. Click Write Story above to preserve an elder&apos;s recollection.
                </p>
              </div>
            </div>
          ) : (
            stories.map((story) => (
              <article
                key={story.id}
                className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white dark:border-[#1E3252] dark:bg-[#0F1D33]"
              >
                {story.coverImageUrl && (
                  <img
                    src={story.coverImageUrl}
                    alt={story.title}
                    referrerPolicy="no-referrer"
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#9A7214] dark:text-[#D4AF37]">
                        {story.eraYear || 'Heritage Account'} · By {story.authorName}
                      </p>
                      <h3 className="font-display mt-1 text-xl font-semibold">{story.title}</h3>
                    </div>
                    {(isAdmin || story.authorUid === user?.uid) && (
                      <button
                        type="button"
                        onClick={() => void deleteArchiveItem('stories', story.id)}
                        className="p-1 text-[#94A3B8] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#475569] dark:text-[#CBD5E1]">
                    {story.content}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* TAB 4: Events */}
      {tab === 'events' && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#64748B] dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#94A3B8]">
              No family events or announcements posted yet.
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E3252] dark:bg-[#0F1D33]"
              >
                <div>
                  <p className="text-xs font-medium capitalize text-[#9A7214] dark:text-[#D4AF37]">
                    {ev.eventType} · {ev.eventDate} {ev.location ? `· ${ev.location}` : ''}
                  </p>
                  <h3 className="font-display mt-1 text-xl font-semibold">{ev.title}</h3>
                  <p className="mt-2 text-sm text-[#475569] dark:text-[#CBD5E1]">{ev.description}</p>
                </div>
                {(isAdmin || ev.authorUid === user?.uid) && (
                  <button
                    type="button"
                    onClick={() => void deleteArchiveItem('events', ev.id)}
                    className="p-1.5 text-[#94A3B8] hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
