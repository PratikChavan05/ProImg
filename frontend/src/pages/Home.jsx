import { useEffect, useState } from "react";
import { PinData } from "../context/PinContext";
import { GridLoader } from "react-spinners";
import PinCard from "../components/PinCard";
import { Compass, Users, Image, Film } from "lucide-react";

const Home = () => {
  const { fetchPins, pins, loading, feedMode } = PinData();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchPins(feedMode);
  }, [feedMode]);

  const filteredPins = pins.filter((pin) => {
    if (filter === "images") return pin.media?.type === "image";
    if (filter === "videos") return pin.media?.type === "video";
    return true;
  });

  return (
    <div className="page-shell">
      <div className="page-container">
        <header className="mb-8">
          <p className="text-ocean-600 text-sm font-semibold uppercase tracking-wide mb-1">Explore</p>
          <h1 className="section-title">Find ideas worth saving</h1>
          <p className="section-sub max-w-lg">
            Browse the community or see posts from people you follow.
          </p>

          <div className="flex flex-wrap gap-2 mt-6">
            <button
              type="button"
              onClick={() => fetchPins("discover")}
              className={feedMode === "discover" ? "chip-active" : "chip-inactive"}
            >
              <Compass size={16} className="inline mr-1.5 -mt-0.5" />
              Discover
            </button>
            <button
              type="button"
              onClick={() => fetchPins("following")}
              className={feedMode === "following" ? "chip-active" : "chip-inactive"}
            >
              <Users size={16} className="inline mr-1.5 -mt-0.5" />
              Following
            </button>
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

        {loading ? (
          <div className="flex flex-col items-center py-24">
            <GridLoader color="#0d9488" size={10} />
            <p className="text-ink-muted mt-4">Loading your feed…</p>
          </div>
        ) : filteredPins.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
            {filteredPins.map((pin) => (
              <div key={pin._id} className="break-inside-avoid">
                <PinCard pin={pin} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ocean-50 flex items-center justify-center text-ocean-600">
              <Compass size={32} />
            </div>
            <h2 className="text-lg font-semibold text-ink mb-2">
              {feedMode === "following" ? "Nothing from your network yet" : "No pins to show"}
            </h2>
            <p className="text-ink-muted text-sm mb-6">
              {feedMode === "following"
                ? "Follow creators to fill this feed, or switch to Discover."
                : "Be the first to share something inspiring."}
            </p>
            <a href="/create" className="btn-primary">
              Create a pin
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
