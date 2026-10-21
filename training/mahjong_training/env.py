import numpy as np
import gymnasium as gym
from gymnasium import spaces
from .bridge import Bridge


class MahjongEnv(gym.Env):
    """One learner; other seats run frozen policies, even after learner wins."""
    metadata = {"render_modes": []}

    def __init__(self, opponents=("random", "efficiency", "teacher"), teacher_samples=32,
                 node=None, snapshots=None):
        super().__init__()
        self.bridge = Bridge(node=node)
        self.meta = self.bridge.request("hello")
        self.observation_space = spaces.Box(-np.inf, np.inf,
                                            shape=(self.meta["observationSize"],), dtype=np.float32)
        self.action_space = spaces.Discrete(self.meta["actions"])
        self.opponents = tuple(opponents)
        if not self.opponents:
            self.close()
            raise ValueError("At least one opponent is required")
        self.teacher_samples = teacher_samples
        self.snapshots = snapshots or {}  # name -> frozen MaskablePPO
        self.state = None
        self.seat = 0
        self.last_score = 0
        self.seen_seeds = set()

    def _advance_external(self, state):
        while not state["done"] and state["actor"] != self.seat:
            model = self.snapshots[self.seat_policies[state["actor"]]]
            action, _ = model.predict(np.asarray(state["observation"], dtype=np.float32),
                                      action_masks=np.asarray(state["mask"], dtype=bool),
                                      deterministic=True)
            state = self.bridge.request("step", action=int(action))
        return state

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        options = options or {}
        game_seed = int(options.get("game_seed", self.np_random.integers(0, 2**31)))
        self.seen_seeds.add(game_seed)
        self.seat = int(options.get("seat", self.np_random.integers(0, 4)))
        if not 0 <= self.seat < 4:
            raise ValueError("seat must be 0..3")
        self.seat_policies = [str(self.np_random.choice(self.opponents)) for _ in range(4)]
        self.seat_policies[self.seat] = "external"
        policies = ["external" if kind in self.snapshots else kind for kind in self.seat_policies]
        self.last_score = 0.0  # Include payments before learner's first decision.
        self.state = self._advance_external(self.bridge.request(
            "reset", seed=game_seed, dealer=int(options.get("dealer", game_seed % 4)),
            policies=policies, viewSeat=self.seat,
            teacherOptions={"samples": self.teacher_samples, "searchDepth": 0}))
        # If all opponents win before our first decision, expose one settlement step.
        return self._obs(), self._info()

    def _obs(self):
        return np.asarray(self.state["observation"], dtype=np.float32)

    def _info(self):
        return {"scores": self.state["scores"], "seat": self.seat,
                "active_players": len(self.state["active"]), "metrics": self.state["metrics"],
                "stage_decisions": self.state["stageDecisions"]}

    def action_masks(self):
        if self.state is None:
            raise RuntimeError("reset must be called first")
        mask = np.asarray(self.state["mask"], dtype=bool)
        if self.state["done"]:
            mask[136] = True
        return mask

    def step(self, action):
        action = int(action)
        if action < 0 or action >= self.action_space.n or not self.action_masks()[action]:
            raise ValueError(f"Illegal action {action}")
        if not self.state["done"]:
            self.state = self._advance_external(self.bridge.request("step", action=action))
        score = float(self.state["scores"][self.seat])
        reward = (score - self.last_score) / 512.0
        self.last_score = score
        return self._obs(), reward, self.state["done"], False, self._info()

    def close(self):
        if getattr(self, "bridge", None):
            self.bridge.close()
