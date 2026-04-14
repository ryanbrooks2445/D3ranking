from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CompositeDef:
    # column -> weight (positive = better, negative = worse)
    weights: dict[str, float]


SIDEARM_COMPOSITES: dict[str, CompositeDef] = {
    "wbball": CompositeDef(
        weights={
            "points_per_game": 2.0,
            "rebounds_per_game": 0.7,
            "assists_per_game": 0.7,
            "steals_per_game": 0.5,
            "blocked_shots_per_game": 0.5,
            "turnovers_per_game": -0.8,
        }
    ),
    "mvball": CompositeDef(
        weights={
            "per_set_stats_kills": 1.6,
            "per_set_stats_digs": 0.8,
            "per_set_stats_blocks": 1.1,
            "per_set_stats_aces": 0.8,
            "attack_stats_hitting_pct": 1.0,
        }
    ),
    "wvball": CompositeDef(
        weights={
            "per_set_stats_kills": 1.6,
            "per_set_stats_digs": 0.8,
            "per_set_stats_blocks": 1.1,
            "per_set_stats_aces": 0.8,
            "attack_stats_hitting_pct": 1.0,
        }
    ),
    "baseball": CompositeDef(
        weights={
            "hitting_stats_batting_average": 1.3,
            "hitting_stats_home_runs": 0.9,
            "hitting_stats_runs_batted_in": 0.8,
            "hitting_stats_runs": 0.6,
            "hitting_stats_stolen_bases": 0.5,
            "hitting_stats_onbase_percentage": 1.0,
            "hitting_stats_slugging_percentage": 1.1,
            "pitching_stats_earned_run_avg": -1.0,
            "pitching_stats_strikeouts": 0.8,
            "pitching_stats_wins": 0.5,
            "pitching_stats_saves": 0.4,
            "pitching_stats_walks_allowed": -0.4,
        }
    ),
    "softball": CompositeDef(
        weights={
            "hitting_stats_batting_average": 1.3,
            "hitting_stats_home_runs": 0.9,
            "hitting_stats_runs_batted_in": 0.8,
            "hitting_stats_runs": 0.6,
            "hitting_stats_stolen_bases": 0.5,
            "hitting_stats_onbase_percentage": 1.0,
            "hitting_stats_slugging_percentage": 1.1,
            "pitching_stats_earned_run_avg": -1.0,
            "pitching_stats_strikeouts": 0.8,
            "pitching_stats_wins": 0.5,
            "pitching_stats_saves": 0.4,
        }
    ),
    "mhockey": CompositeDef(
        weights={
            "shot_stats_goals": 1.1,
            "shot_stats_assists": 1.0,
            "shot_stats_points": 1.2,
            "faceoff_stats_faceoff_pct": 0.5,
            "goalie_stats_save_pct": 1.0,
            "goalie_stats_goals_against_avg": -0.8,
        }
    ),
    "whockey": CompositeDef(
        weights={
            "shot_stats_goals": 1.1,
            "shot_stats_assists": 1.0,
            "shot_stats_points": 1.2,
            "faceoff_stats_faceoff_pct": 0.5,
            "goalie_stats_save_pct": 1.0,
            "goalie_stats_goals_against_avg": -0.8,
        }
    ),
    "mlax": CompositeDef(
        weights={
            "shot_stats_goals": 1.2,
            "shot_stats_assists": 1.0,
            "shot_stats_points": 1.1,
            "misc_stats_ground_balls": 0.7,
            "misc_stats_caused_turnovers": 0.7,
            "goalie_stats_save_pct": 0.9,
            "goalie_stats_goals_against_avg": -0.8,
            "goalie_stats_saves": 0.5,
        }
    ),
    "wlax": CompositeDef(
        weights={
            "shot_stats_goals": 1.2,
            "shot_stats_assists": 1.0,
            "shot_stats_points": 1.1,
            "misc_stats_ground_balls": 0.7,
            "misc_stats_caused_turnovers": 0.7,
            "goalie_stats_save_pct": 0.9,
            "goalie_stats_goals_against_avg": -0.8,
            "goalie_stats_saves": 0.5,
        }
    ),
    "msoc": CompositeDef(
        weights={
            "shot_stats_goals": 1.2,
            "shot_stats_assists": 1.0,
            "shot_stats_points": 1.1,
            "shot_stats_shots_on_goal": 0.5,
            "goalie_stats_save_percentage": 0.9,
            "goalie_stats_goals_against_avg": -0.9,
        }
    ),
    "wsoc": CompositeDef(
        weights={
            "shot_stats_goals": 1.2,
            "shot_stats_assists": 1.0,
            "shot_stats_points": 1.1,
            "shot_stats_shots_on_goal": 0.5,
            "goalie_stats_save_percentage": 0.9,
            "goalie_stats_goals_against_avg": -0.9,
        }
    ),
    "football": CompositeDef(
        weights={
            "pass_stats_yards": 1.0,
            "pass_stats_touchdowns": 1.0,
            "pass_stats_efficiency": 0.5,
            "rush_stats_net_yards": 1.0,
            "rush_stats_touchdowns": 0.9,
            "receiving_stats_yards": 0.9,
            "receiving_stats_touchdowns": 0.8,
            "defense_stats_total_tackles": 0.7,
            "defense_stats_tackles_for_loss": 0.6,
            "defense_stats_sacks": 0.8,
            "defense_stats_interceptions": 0.9,
            "defense_stats_passes_defended": 0.5,
            "fieldgoal_stats_made": 0.6,
            "fieldgoal_stats_percentage": 0.4,
            "punt_stats_avg_per_punt": 0.4,
            "punt_stats_inside_twenty": 0.4,
            "kickreturn_stats_yards": 0.4,
            "puntreturn_stats_yards": 0.3,
            "pass_stats_interceptions": -0.7,
            "fumble_stats_number_lost": -0.6,
        }
    ),
    "mgolf": CompositeDef(
        weights={
            "scoring_stats_scoring_average": -1.6,
            "scoring_stats_vs_par": -1.2,
            "scoring_stats_rounds": 0.4,
            "scoring_stats_strokes": -0.3,
            "top10_finishes": 0.7,
        }
    ),
    "wgolf": CompositeDef(
        weights={
            "scoring_stats_scoring_average": -1.6,
            "scoring_stats_vs_par": -1.2,
            "scoring_stats_rounds": 0.4,
            "scoring_stats_strokes": -0.3,
            "top10_finishes": 0.7,
        }
    ),
    "mten": CompositeDef(
        weights={
            "overall_stats_singles_wins": 1.2,
            "overall_stats_doubles_wins": 1.0,
            "overall_stats_total_wins": 1.1,
            "overall_stats_win_pct": 1.0,
            "overall_stats_singles_losses": -0.8,
            "overall_stats_doubles_losses": -0.7,
        }
    ),
    "wten": CompositeDef(
        weights={
            "overall_stats_singles_wins": 1.2,
            "overall_stats_doubles_wins": 1.0,
            "overall_stats_total_wins": 1.1,
            "overall_stats_win_pct": 1.0,
            "overall_stats_singles_losses": -0.8,
            "overall_stats_doubles_losses": -0.7,
        }
    ),
}
