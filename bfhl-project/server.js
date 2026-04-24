const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Helper function: validate edge
function isValidEdge(edge) {
    if (typeof edge !== "string") return false;
    edge = edge.trim();

    const regex = /^[A-Z]->[A-Z]$/;

    if (!regex.test(edge)) return false;

    const [parent, child] = edge.split("->");

    if (parent === child) return false;

    return true;
}

// Build tree
function buildHierarchy(edges) {
    const graph = {};
    const childSet = new Set();

    edges.forEach(e => {
        const [p, c] = e.split("->");

        if (!graph[p]) graph[p] = [];
        graph[p].push(c);

        childSet.add(c);
    });

    // find roots
    const roots = Object.keys(graph).filter(n => !childSet.has(n));

    return { graph, roots };
}

// DFS for tree + cycle
function buildTree(node, graph, visited, path) {
    if (path.has(node)) {
        return { cycle: true };
    }

    path.add(node);

    let tree = {};
    let maxDepth = 1;

    if (graph[node]) {
        for (let child of graph[node]) {
            let res = buildTree(child, graph, visited, path);

            if (res.cycle) return { cycle: true };

            tree[child] = res.tree;
            maxDepth = Math.max(maxDepth, 1 + res.depth);
        }
    }

    path.delete(node);

    return { tree, depth: maxDepth };
}

// API
app.post("/bfhl", (req, res) => {
    const data = req.body.data || [];

    let invalid = [];
    let duplicates = [];
    let seen = new Set();
    let validEdges = [];

    data.forEach(e => {
        let trimmed = e.trim();

        if (!isValidEdge(trimmed)) {
            invalid.push(e);
        } else if (seen.has(trimmed)) {
            if (!duplicates.includes(trimmed))
                duplicates.push(trimmed);
        } else {
            seen.add(trimmed);
            validEdges.push(trimmed);
        }
    });

    const { graph, roots } = buildHierarchy(validEdges);

    let hierarchies = [];
    let totalTrees = 0;
    let totalCycles = 0;
    let largestRoot = "";
    let maxDepth = 0;

    let visited = new Set();

    roots.forEach(root => {
        let res = buildTree(root, graph, visited, new Set());

        if (res.cycle) {
            totalCycles++;
            hierarchies.push({
                root,
                tree: {},
                has_cycle: true
            });
        } else {
            totalTrees++;

            if (res.depth > maxDepth ||
               (res.depth === maxDepth && root < largestRoot)) {
                maxDepth = res.depth;
                largestRoot = root;
            }

            hierarchies.push({
                root,
                tree: { [root]: res.tree },
                depth: res.depth
            });
        }
    });

    res.json({
        user_id: "yourname_ddmmyyyy",
        email_id: "your_email@srm.edu",
        college_roll_number: "your_roll",
        hierarchies,
        invalid_entries: invalid,
        duplicate_edges: duplicates,
        summary: {
            total_trees: totalTrees,
            total_cycles: totalCycles,
            largest_tree_root: largestRoot
        }
    });
});

// Start server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
