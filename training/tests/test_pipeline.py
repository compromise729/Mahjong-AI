import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import torch
from sb3_contrib import MaskablePPO
from mahjong_training.data import generate
from mahjong_training.train import imitate, reinforce
from mahjong_training.evaluate import evaluate


class PipelineTests(unittest.TestCase):
    def test_imitation_ppo_resume_and_frozen_opponent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            generate(root / 'data', games=3, seed=80000, teacher='teacher', samples=0)
            bc = imitate(root / 'data', root / 'bc', epochs=1, batch=16, device='cpu')
            resumed_bc = imitate(root / 'data', root / 'bc-resume', epochs=2, batch=16,
                                 device='cpu', resume=str(root / 'bc' / 'last.ckpt'))
            self.assertTrue(resumed_bc.is_file())
            before = MaskablePPO.load(bc, device='cpu')
            checkpoint = reinforce(root / 'ppo', steps=32, warm_start=bc, device='cpu',
                                   opponents=('efficiency',), rollout=16, batch=8, teacher_samples=0)
            trained = MaskablePPO.load(checkpoint, device='cpu')
            self.assertEqual(trained.num_timesteps, 32)
            self.assertTrue(trained.policy.optimizer.state)
            self.assertTrue(any(not torch.equal(a, b) for a, b in
                                zip(before.policy.parameters(), trained.policy.parameters())))
            resumed = reinforce(root / 'resume', steps=16, resume=checkpoint, device='cpu',
                                opponents=('random',), snapshots=(bc,), teacher_samples=0)
            self.assertEqual(MaskablePPO.load(resumed, device='cpu').num_timesteps, 48)
            meta = json.loads(resumed.with_suffix('.meta.json').read_text(encoding='utf-8'))
            self.assertIn('snapshot-0', meta['opponents'])
            self.assertTrue(meta['trainingSeeds'])
            report = evaluate(resumed, root / 'evaluation', seeds=2,
                              seed_start=3000000, opponent='efficiency', samples=0)
            self.assertEqual(report['pairedRounds'], 8)
            self.assertFalse(report['positiveEvidence'])


if __name__ == '__main__':
    unittest.main()
