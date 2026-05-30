import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PinData } from "../context/PinContext";
import { UserData } from "../context/UserContext";
import { GridLoader } from "react-spinners";
import PinCard from "../components/PinCard";
import customAxios from "../config/axios";
import { Compass, Users, Image, Film, Search as SearchIcon, X } from "lucide-react";

const Home = () => {
  const { isAuth } = UserData();
  const { fetchPins, pins, loading: feedLoading, feedMode } = PinData();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(query);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [filter, setFilter] = useState("all");

  // Sync state if URL query changes externally
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Debounced search-as-you-type (400ms)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed !== query) {
        // Only trigger search in URL if empty (to reset) or at least 2 characters long
        if (trimmed === "" || trimmed.length >= 2) {
          setSearchParams(trimmed ? { q: trimmed } : {});
        }
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [inputValue, query, setSearchParams]);

  // Fetch feed pins when feedMode changes (only if search query is empty)
  useEffect(() => {
    if (!query) {
      fetchPins(feedMode);
    }
  }, [feedMode, query]);

  // Fetch search results if search query is present
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();

    const performSearch = async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const response = await customAxios.get(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        // Map Elasticsearch flat structure to expected Pin schema
        const mappedPins = (response.data || []).map(pin => ({
          ...pin,
          media: {
            url: pin.mediaUrl,
            type: pin.mediaType
          }
        }));
        setSearchResults(mappedPins);
      } catch (err) {
        if (customAxios.isCancel(err) || err.name === "CanceledError") {
          // Request was aborted because a new query replaced it; do nothing
          return;
        }
        console.error("Search failed:", err);
        setSearchError("Could not complete the search. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    };

    performSearch();

    // Cleanup: cancel pending request if query changes before resolving
    return () => {
      controller.abort();
    };
  }, [query]);

  const handleFeedModeChange = (mode) => {
    setInputValue("");
    setSearchParams({});
    fetchPins(mode);
  };

  // Determine active pins and loading state
  const activePins = query ? searchResults : pins;
  const isLoading = query ? searchLoading : feedLoading;

  const filteredPins = activePins.filter((pin) => {
    if (filter === "images") return pin.media?.type === "image";
    if (filter === "videos") return pin.media?.type === "video";
    return true;
  });

  return (
    <div className="page-shell">
      <div className="page-container">
        <header className="mb-8">
          <p className="text-ocean-600 text-sm font-semibold uppercase tracking-wide mb-1">
            {query ? "Search Results" : "Explore"}
          </p>
          <h1 className="section-title">
            {query ? `Results for "${query}"` : "Find ideas worth saving"}
          </h1>
          <p className="section-sub max-w-lg">
            {query
              ? "Discover pins matching your keywords using Elasticsearch autocomplete."
              : "Browse the community, search for new ideas, or see posts from people you follow."}
          </p>

          {/* Premium Search Bar */}
          <div className="relative max-w-lg mt-6">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" size={20} />
            <input
              type="text"
              placeholder="Search ideas instantly as you type..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-field !pl-10 !pr-10 !py-2.5 shadow-soft border-stone-200/80 focus:border-ocean-300 w-full"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  setSearchParams({});
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <button
              key="discover"
              type="button"
              onClick={() => handleFeedModeChange("discover")}
              className={!query && feedMode === "discover" ? "chip-active" : "chip-inactive"}
            >
              <Compass size={16} className="inline mr-1.5 -mt-0.5" />
              Discover
            </button>
            {isAuth && (
              <button
                key="following"
                type="button"
                onClick={() => handleFeedModeChange("following")}
                className={!query && feedMode === "following" ? "chip-active" : "chip-inactive"}
              >
                <Users size={16} className="inline mr-1.5 -mt-0.5" />
                Following
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { id: "all", label: "All", icon: null },
              { id: "images", label: "Photos", icon: Image },
              { id: "videos", label: "Videos", icon: Film }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={filter === id ? "chip-active" : "chip-inactive"}
              >
                {Icon && <Icon size={14} className="inline mr-1 -mt-0.5" />}
                {label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center py-24">
            <GridLoader color="#0d9488" size={10} />
            <p className="text-ink-muted mt-4">
              {query ? "Searching Elasticsearch..." : "Loading your feed…"}
            </p>
          </div>
        ) : searchError ? (
          <div className="card p-12 text-center max-w-md mx-auto border-red-200">
            <p className="text-red-600 font-medium">{searchError}</p>
          </div>
        ) : filteredPins.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPins.map((pin) => (
              <PinCard key={pin._id} pin={pin} />
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ocean-50 flex items-center justify-center text-ocean-600">
              <Compass size={32} />
            </div>
            <h2 className="text-lg font-semibold text-ink mb-2">
              {query ? "No results found" : feedMode === "following" ? "Nothing from your network yet" : "No pins to show"}
            </h2>
            <p className="text-ink-muted text-sm mb-6">
              {query
                ? `We couldn't find any pins matching "${query}". Try checking your spelling or using different keywords.`
                : feedMode === "following"
                  ? "Follow creators to fill this feed, or switch to Discover."
                  : "Be the first to share something inspiring."}
            </p>
            {!query && (
              <a href="/create" className="btn-primary">
                Create a pin
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
