import argparse
import json


def main():
    parser = argparse.ArgumentParser(description="Sichuan blood-battle training (4 -> 3 -> 2 players)")
    commands = parser.add_subparsers(dest="command", required=True)
    data = commands.add_parser("generate", help="Generate whole-round demonstration shards")
    data.add_argument("--output", required=True)
    data.add_argument("--games", type=int, default=1000)
    data.add_argument("--seed", type=int, default=10000)
    data.add_argument("--teacher", choices=["teacher", "efficiency", "random"], default="teacher")
    data.add_argument("--samples", type=int, default=32)
    bc = commands.add_parser("imitate", help="Lightning supervised warm start")
    bc.add_argument("--data", required=True)
    bc.add_argument("--output", required=True)
    bc.add_argument("--epochs", type=int, default=10)
    bc.add_argument("--batch", type=int, default=64)
    bc.add_argument("--seed", type=int, default=0)
    bc.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    bc.add_argument("--resume", help="Own Lightning last.ckpt; epochs is the new total")
    rl = commands.add_parser("ppo", help="PPO training / resume with frozen opponent pool")
    rl.add_argument("--output", required=True)
    rl.add_argument("--steps", type=int, default=100000)
    source = rl.add_mutually_exclusive_group()
    source.add_argument("--warm-start", help="Own imitation policy.zip")
    source.add_argument("--resume", help="Own PPO step-N.zip; steps is additional budget")
    rl.add_argument("--seed", type=int, default=100000)
    rl.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    rl.add_argument("--opponents", nargs="+", choices=["teacher", "efficiency", "random"],
                    default=["random", "efficiency", "teacher"])
    rl.add_argument("--teacher-samples", type=int, default=32)
    rl.add_argument("--snapshots", nargs="*", default=[], help="Validated own frozen policy.zip files")
    rl.add_argument("--rollout", type=int, default=256)
    rl.add_argument("--batch", type=int, default=64)
    ev = commands.add_parser("evaluate", help="Paired seeds, four seat rotations vs first-version teacher")
    ev.add_argument("--model", required=True)
    ev.add_argument("--output", required=True)
    ev.add_argument("--seeds", type=int, default=1000)
    ev.add_argument("--seed-start", type=int, default=2000000)
    ev.add_argument("--opponent", choices=["teacher", "efficiency", "random"], default="teacher")
    ev.add_argument("--samples", type=int, default=32)
    commands.add_parser("doctor", help="Check simulator protocol and installed dependencies")
    args = vars(parser.parse_args())
    command = args.pop("command")
    if command == "generate":
        from .data import generate
        args["directory"] = args.pop("output")
        generate(**args)
    elif command == "imitate":
        from .train import imitate
        print(imitate(**args))
    elif command == "ppo":
        from .train import reinforce
        print(reinforce(**args))
    elif command == "evaluate":
        from .evaluate import evaluate
        args["model_path"] = args.pop("model")
        print(json.dumps(evaluate(**args), ensure_ascii=False, indent=2))
    else:
        from .bridge import Bridge
        from .artifacts import versions
        import torch
        with Bridge() as bridge:
            print(json.dumps({**bridge.request("hello"), "versions": versions(),
                              "cuda": torch.cuda.is_available()}, indent=2))


if __name__ == "__main__":
    main()
