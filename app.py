from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from main import rank_cne_mbb_players_2025_26, scrape_cne_mbb_players_2025_26


DATA_DIR = Path("data")
PLAYERS_CSV = DATA_DIR / "cne_mbb_players_2025_26.csv"
RANKINGS_CSV = DATA_DIR / "cne_mbb_player_rankings_2025_26.csv"


@st.cache_data(show_spinner=False)
def _load_csv(path: str) -> pd.DataFrame:
    return pd.read_csv(path)


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _scrape_and_write() -> tuple[pd.DataFrame, pd.DataFrame]:
    _ensure_data_dir()
    players_df = scrape_cne_mbb_players_2025_26(conf_only=False)
    rankings_df = rank_cne_mbb_players_2025_26(players_df)
    players_df.to_csv(PLAYERS_CSV, index=False)
    rankings_df.to_csv(RANKINGS_CSV, index=False)
    return players_df, rankings_df


st.set_page_config(page_title="CNE MBB Rankings", layout="wide")
st.title("Conference of New England — Men's Basketball (2025–26)")
st.caption("Composite player rankings built from CNE season stats.")

with st.sidebar:
    st.subheader("Data")
    st.write("Uses local CSVs if present, or scrape live.")

    scrape_now = st.button("Scrape / Refresh data", type="primary")
    st.divider()
    st.subheader("Filters")
    min_gp = st.slider("Min games played (GP)", min_value=0, max_value=30, value=10, step=1)
    min_mpg = st.slider("Min minutes per game (MPG)", min_value=0, max_value=40, value=10, step=1)

if scrape_now:
    try:
        with st.spinner("Scraping CNE stats and recomputing rankings..."):
            _scrape_and_write()
        _load_csv.clear()  # clear cache so UI shows new data
        st.success("Refreshed.")
    except Exception as e:
        st.error(f"Scrape failed: {e}")

rankings_df: pd.DataFrame | None = None
players_df: pd.DataFrame | None = None

if RANKINGS_CSV.exists():
    rankings_df = _load_csv(str(RANKINGS_CSV))
if PLAYERS_CSV.exists():
    players_df = _load_csv(str(PLAYERS_CSV))

if rankings_df is None or players_df is None:
    st.warning("No local data found yet.")
    st.write("Click **Scrape / Refresh data** in the sidebar to pull the latest CNE season stats.")
    st.stop()

rankings_view = rankings_df.copy()
rankings_view["gp"] = pd.to_numeric(rankings_view.get("gp"), errors="coerce")
rankings_view["mpg"] = pd.to_numeric(rankings_view.get("mpg"), errors="coerce")
rankings_view = rankings_view[(rankings_view["gp"] >= min_gp) & (rankings_view["mpg"] >= min_mpg)]

left, right = st.columns([3, 2])
with left:
    st.subheader("Rankings")
    st.dataframe(rankings_view, use_container_width=True, hide_index=True)

with right:
    st.subheader("Downloads")
    st.download_button(
        "Download rankings CSV",
        data=rankings_df.to_csv(index=False).encode("utf-8"),
        file_name="cne_mbb_player_rankings_2025_26.csv",
        mime="text/csv",
        use_container_width=True,
    )
    st.download_button(
        "Download raw players CSV",
        data=players_df.to_csv(index=False).encode("utf-8"),
        file_name="cne_mbb_players_2025_26.csv",
        mime="text/csv",
        use_container_width=True,
    )

