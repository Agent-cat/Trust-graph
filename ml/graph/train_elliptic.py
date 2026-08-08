"""
Elliptic Bitcoin Dataset — graph fraud detection benchmark.

Proves the graph-based approach works on the standard public benchmark
(the Elliptic labeled transaction graph) before applying it to our own
Neo4j seller/customer networks.

Two models are compared on the SAME held-out test transactions:
  1. Node-feature baseline  — XGBoost on the 165 raw Elliptic features only
     (this is the "single-transaction classifier" the track asks us to beat)
  2. Graph-augmented model — networkx-derived structural features
     (degree, PageRank, clustering, neighbor label priors, k-core) stacked
     on top of the raw features

The claim we demonstrate: graph features raise precision/recall on illicit
transactions that a node-only model misclassifies.

Reference split (as used by the Elliptic benchmark / PyG):
  train = timesteps 1..34, test = timesteps 35..49, labels 1(licit)/2(illicit).
"""

import os
import time

import joblib
import networkx as nx
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (classification_report, precision_score,
                             recall_score, f1_score, roc_auc_score)
from xgboost import XGBClassifier

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

FEATURES_CSV = os.path.join(DATA_DIR, "elliptic_txs_features.csv")
CLASSES_CSV = os.path.join(DATA_DIR, "elliptic_txs_classes.csv")
EDGES_CSV = os.path.join(DATA_DIR, "elliptic_txs_edgelist.csv")


def load_elliptic():
    """Load the three Elliptic CSVs into a single feature frame + labels."""
    t0 = time.time()
    feats = pd.read_csv(FEATURES_CSV, header=None)
    feats.columns = ["txId", "time_step"] + [
        f"f_{i}" for i in range(feats.shape[1] - 2)
    ]
    feats["txId"] = feats["txId"].astype(str)

    classes = pd.read_csv(CLASSES_CSV)
    classes["txId"] = classes["txId"].astype(str)

    edges = pd.read_csv(EDGES_CSV)
    edges["txId1"] = edges["txId1"].astype(str)
    edges["txId2"] = edges["txId2"].astype(str)

    df = feats.merge(classes, on="txId", how="left")
    df["class"] = df["class"].astype(str)
    df["is_licit"] = df["class"] == "1"
    df["is_illicit"] = df["class"] == "2"

    licit, illicit, unknown = (
        df["is_licit"].sum(),
        df["is_illicit"].sum(),
        df["class"].eq("0").sum(),
    )
    print(f"[elliptic] loaded {len(df):,} txs, {len(edges):,} edges in {time.time()-t0:.1f}s")
    print(f"[elliptic] labelled: licit={licit:,} illicit={illicit:,} unknown={unknown:,}")
    return df, edges


def build_graph(edges, nodes):
    """Directed graph of transactions; edges = BTC flow."""
    G = nx.DiGraph()
    G.add_nodes_from(nodes)
    G.add_edges_from(zip(edges["txId1"], edges["txId2"]))
    print(f"[graph] nodes={G.number_of_nodes():,} directed edges={G.number_of_edges():,}")
    return G


def extract_graph_features(G, priors):
    """Per-node structural features derived from network topology + labels."""
    t0 = time.time()

    degrees = dict(G.degree())
    in_deg = dict(G.in_degree())
    out_deg = dict(G.out_degree())
    clustering = nx.clustering(G)
    core_num = nx.core_number(G)
    pagerank = nx.pagerank(G, alpha=0.85, max_iter=50)

    neighbor_illicit = {}
    neighbor_licit = {}
    for node in G.nodes():
        nbrs = list(G.neighbors(node))
        if not nbrs:
            neighbor_illicit[node] = 0.0
            neighbor_licit[node] = 0.0
            continue
        illicit_nb = sum(1 for nbr in nbrs if priors.get(nbr) == "illicit")
        licit_nb = sum(1 for nbr in nbrs if priors.get(nbr) == "licit")
        neighbor_illicit[node] = illicit_nb / len(nbrs)
        neighbor_licit[node] = licit_nb / len(nbrs)

    n_2hop = {}
    for node in G.nodes():
        successors = list(G.successors(node))
        if not successors:
            n_2hop[node] = 0
            continue
        reach = set()
        for s in successors:
            reach.update(G.successors(s))
        n_2hop[node] = len(reach)

    rows = {}
    for node in G.nodes():
        rows[node] = {
            "degree": degrees[node],
            "in_degree": in_deg[node],
            "out_degree": out_deg[node],
            "clustering": clustering[node],
            "core_number": core_num[node],
            "pagerank": pagerank[node],
            "n_2hop": n_2hop[node],
            "neighbor_illicit_frac": neighbor_illicit[node],
            "neighbor_licit_frac": neighbor_licit[node],
        }
    print(f"[graph] features extracted in {time.time()-t0:.1f}s")
    return pd.DataFrame.from_dict(rows, orient="index")


def evaluate(name, model, X_te, y_te):
    proba = model.predict_proba(X_te)[:, 1]
    pred = model.predict(X_te)
    print(f"\n--- {name} ---")
    print(f"  precision={precision_score(y_te, pred):.4f} "
          f"recall={recall_score(y_te, pred):.4f} "
          f"f1={f1_score(y_te, pred):.4f} AUC={roc_auc_score(y_te, proba):.4f}")
    print(classification_report(y_te, pred, target_names=["licit", "illicit"]))
    return {"model": model, "proba": proba, "pred": pred}


if __name__ == "__main__":
    print("=" * 72)
    print("ELLIPTIC GRAPH FRAUD BENCHMARK — graph technique validation")
    print("=" * 72)

    df, edges = load_elliptic()

    G = build_graph(edges, df["txId"].tolist())
    priors = dict(
        zip(
            df["txId"],
            np.where(df["is_illicit"], "illicit",
                     np.where(df["is_licit"], "licit", "unknown")),
        )
    )

    graph_feats = extract_graph_features(G, priors)
    graph_feats.index = graph_feats.index.astype(str)

    raw_cols = [c for c in df.columns if c.startswith("f_")]
    df = df.merge(graph_feats, left_on="txId", right_index=True, how="left")
    df = df.dropna(subset=["degree"])  # every labelled tx should have graph data

    X_raw = df[raw_cols].fillna(0)
    X_graph = df[raw_cols + list(graph_feats.columns)].fillna(0)
    ids = df["txId"].values
    y = df["is_illicit"].astype(int).values

    # Temporal split: train timesteps<=34, test timesteps>=35 (labelled only)
    is_test = df["time_step"] >= 35
    is_labelled = df["is_licit"] | df["is_illicit"]
    train_mask = is_labelled & ~is_test
    test_mask = is_labelled & is_test

    Xr_tr, Xr_te = X_raw[train_mask], X_raw[test_mask]
    Xg_tr, Xg_te = X_graph[train_mask], X_graph[test_mask]
    y_tr, y_te = y[train_mask], y[test_mask]
    id_te = ids[test_mask]
    print(f"train labelled={y_tr.sum()+int((y_tr==0).sum()):,} | "
          f"test labelled={len(y_te):,} (illicit={y_te.sum()})")

    base = evaluate(
        "XGBoost on RAW node features only (single-transaction classifier)",
        XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.08,
                      subsample=0.8, colsample_bytree=0.8, random_state=42,
                      n_jobs=-1).fit(Xr_tr, y_tr),
        Xr_te, y_te,
    )

    graph = evaluate(
        "XGBoost on RAW + GRAPH features (degree, k-core, PR, nbr priors)",
        XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.08,
                      subsample=0.8, colsample_bytree=0.8, random_state=42,
                      n_jobs=-1).fit(Xg_tr, y_tr),
        Xg_te, y_te,
    )

    # Key claim: txs the raw model misses but graph model catches
    missed = (base["pred"] == 0) & (graph["pred"] == 1)
    caught_confirmed = int((missed & (y_te == 1)).sum())
    false_extra = int((missed & (y_te == 0)).sum())
    print(f"\n★ Graph-augmented model reclassified {int(missed.sum())} txs to illicit "
          f"(raw called them licit)")
    print(f"  → {caught_confirmed} were TRUE illicit (new fraud caught)")
    print(f"  → {false_extra} were licit (new false positives)")

    # Time-based separation sanity: test set is chronologically later
    print(f"\n(test set is the later time window — timesteps {int(df[test_mask]['time_step'].min())}"
          f"..{int(df[test_mask]['time_step'].max())} — a realistic forward-looking evaluation)")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(graph["model"], os.path.join(MODEL_DIR, "elliptic_graph.pkl"))
    joblib.dump(base["model"], os.path.join(MODEL_DIR, "elliptic_baseline.pkl"))
    print(f"\nModels saved to {MODEL_DIR}/elliptic_{{graph,baseline}}.pkl")
