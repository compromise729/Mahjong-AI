import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from mahjong_training.env import MahjongEnv
from mahjong_training.data import generate, Demonstrations
from mahjong_training.artifacts import verify_meta


class TrainingTests(unittest.TestCase):
    def test_learner_is_not_always_dealer(self):
        env = MahjongEnv(opponents=("random",), teacher_samples=0)
        try:
            relative = set()
            for seed in range(16):
                env.reset(seed=seed, options={"game_seed": seed})
                relative.add((env.seat - seed % 4) % 4)
            self.assertEqual(relative, {0, 1, 2, 3})
        finally:
            env.close()

    def test_reward_equals_final_ledger_and_legal_mask(self):
        env = MahjongEnv(opponents=("efficiency",), teacher_samples=0)
        try:
            for seed in range(8):
                obs, info = env.reset(seed=seed, options={"game_seed": seed, "seat": seed % 4})
                total = 0
                for _ in range(1000):
                    action = int(np.flatnonzero(env.action_masks())[0])
                    obs, reward, done, truncated, info = env.step(action)
                    total += reward
                    self.assertTrue(env.observation_space.contains(obs))
                    self.assertFalse(truncated)
                    if done:
                        break
                self.assertTrue(done)
                self.assertAlmostEqual(total * 512, info["scores"][env.seat])
        finally:
            env.close()

    def test_dataset_split_is_by_game_and_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "data"
            manifest = generate(target, games=3, seed=200, teacher="efficiency", samples=0)
            sets = [Demonstrations(target, split) for split in ("train", "validation", "test")]
            self.assertTrue(all(len(s) > 0 for s in sets))
            seeds = [set(s.game_seeds) for s in sets]
            self.assertFalse(seeds[0] & seeds[1] or seeds[1] & seeds[2] or seeds[0] & seeds[2])
            for dataset in sets:
                obs, mask, action, value = dataset[0]
                self.assertTrue(mask[action])
                self.assertEqual(len(obs), manifest["observationSize"])
            with self.assertRaisesRegex(ValueError, "ruleHash"):
                verify_meta(manifest, {**manifest, "ruleHash": "wrong"})


if __name__ == "__main__":
    unittest.main()
