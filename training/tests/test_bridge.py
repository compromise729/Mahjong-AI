import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mahjong_training.bridge import Bridge


class BridgeTests(unittest.TestCase):
    def test_complete_game_and_reproducible_reset(self):
        with Bridge() as b:
            meta = b.request("hello")
            self.assertEqual(meta["actions"], 137)
            first = b.request("reset", seed=31, policies=["external"] * 4)
            again = b.request("reset", seed=31, policies=["external"] * 4)
            self.assertEqual(first, again)
            while not again["done"]:
                action = b.request("teacher", kind="efficiency")["action"]
                self.assertTrue(again["mask"][action])
                again = b.request("step", action=action)
            self.assertEqual(sum(again["scores"]), 0)
            self.assertEqual(again["schema"], meta["schema"])
        self.assertIsNotNone(b.process.poll())

    def test_remote_errors_are_visible_and_connection_can_close(self):
        with Bridge() as b:
            with self.assertRaisesRegex(RuntimeError, "Unknown command"):
                b.request("not_a_command")


if __name__ == "__main__":
    unittest.main()
