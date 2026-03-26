"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HelpCircle, Copy, Check, Loader2 } from "lucide-react";
import { useLocks } from "@/hooks/use-locks";
import { formatAmount } from "@/lib/format";

interface Relay {
  id: string;
  name: string;
  lockId: string;
  address: string;
  votingPower: string;
  votingPowerPercent: string;
  rewards: string;
  apr: string;
  updatedAt: string;
  isActive?: boolean;
}

const sampleRelays: Relay[] = [
  {
    id: "1",
    name: "veMEGA Maxi",
    lockId: "ID 10298",
    address: "0xc981...F14f",
    votingPower: "47.18M",
    votingPowerPercent: "4.96614%",
    rewards: "MEGA",
    apr: "19.5%",
    updatedAt: "Updated 2 days ago",
    isActive: true,
  },
  {
    id: "2",
    name: "Moonwell veMEGA",
    lockId: "ID 11129",
    address: "0x3470...e76d",
    votingPower: "17.97M",
    votingPowerPercent: "1.89164%",
    rewards: "MEGA",
    apr: "16.15%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "3",
    name: "Reserve veMEGA",
    lockId: "ID 26689",
    address: "0x94bd...feD3",
    votingPower: "3,777,828.87",
    votingPowerPercent: "0.39758%",
    rewards: "MEGA",
    apr: "6.28268%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "4",
    name: "RSR veMEGA",
    lockId: "ID 63961",
    address: "0x4AcB...411b",
    votingPower: "18,297.91",
    votingPowerPercent: "0.00192%",
    rewards: "MEGA",
    apr: "6.36196%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "5",
    name: "BAKLAVA veMEGA",
    lockId: "ID 21952",
    address: "0xA0be...bcA0",
    votingPower: "17,039.95",
    votingPowerPercent: "0.00179%",
    rewards: "MEGA",
    apr: "12.43%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "6",
    name: "Chia veMEGA",
    lockId: "ID 23266",
    address: "0xA97A...D59A",
    votingPower: "13,557.76",
    votingPowerPercent: "0.00142%",
    rewards: "MEGA",
    apr: "13.71%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "7",
    name: "Universal veMEGA",
    lockId: "ID 36657",
    address: "0x4135...d8E9",
    votingPower: "11,239.61",
    votingPowerPercent: "0.00118%",
    rewards: "MEGA",
    apr: "6.36043%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "8",
    name: "RWAX veMEGA",
    lockId: "ID 32191",
    address: "0x9212...9ef9",
    votingPower: "7,036.04",
    votingPowerPercent: "0.00074%",
    rewards: "MEGA",
    apr: "18.81%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "9",
    name: "AYB veMEGA",
    lockId: "ID 21953",
    address: "0x8F84...A7Fd",
    votingPower: "6,834.05",
    votingPowerPercent: "0.00071%",
    rewards: "MEGA",
    apr: "21.57%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "10",
    name: "Truflation veMEGA",
    lockId: "ID 23267",
    address: "0xb765...9597",
    votingPower: "4,486.93",
    votingPowerPercent: "0.00047%",
    rewards: "MEGA",
    apr: "22.57%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "11",
    name: "TOWER veMEGA",
    lockId: "ID 20085",
    address: "0x464a...cB6F",
    votingPower: "1,302.27",
    votingPowerPercent: "0.00013%",
    rewards: "MEGA",
    apr: "37.18%",
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "12",
    name: "DeFiScan Stage 1 & 2 Support Flywheel veMEGA",
    lockId: "ID 62488",
    address: "0x5321...952F",
    votingPower: "722.99",
    votingPowerPercent: "0.00007%",
    rewards: "MEGA",
    apr: "3.14792%",
    updatedAt: "Updated 2 days ago",
  },
];

function formatDuration(weeks: number) {
  if (weeks <= 0) return "Expired";
  if (weeks >= 52) {
    const years = Math.floor(weeks / 52);
    const rem = weeks % 52;
    return rem === 0
      ? `${years} year${years !== 1 ? "s" : ""}`
      : `${years}y ${rem}w`;
  }
  return `${weeks * 7} days`;
}

export default function Lock() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { locks, isLoading } = useLocks();

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 rounded-2xl bg-[#0d1f1a]/80 backdrop-blur-xl p-6 lg:p-8 border border-white/10">
        <p className="text-white/80 text-sm md:text-base">
          Gain{" "}
          <span className="font-semibold text-white">greater voting power</span>{" "}
          and <span className="font-semibold text-white">higher rewards</span>,
          by locking more tokens for longer.
        </p>
        <Link
          href="/lock/create"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-full bg-[#f7931a]/10 text-[#f7931a] hover:bg-[#f7931a]/20 transition-colors border border-transparent"
        >
          Create Lock
        </Link>
      </div>

      {/* Locks Section */}
      <div className="space-y-6">
        <div className="mt-12">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Locks</h2>
            <button type="button" className="group">
              <HelpCircle className="w-[18px] h-[18px] text-white/40 hover:text-white/50 transition-colors" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* Loading state */}
          {isLoading && (
            <div className="rounded-xl bg-[#0d1f1a]/80 backdrop-blur-xl p-6 border border-white/10 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-[#f7931a] animate-spin" />
              <span className="text-sm text-white/50">
                Loading your locks...
              </span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && locks.length === 0 && (
            <div className="rounded-xl bg-[#0d1f1a]/80 backdrop-blur-xl p-6 border border-white/10">
              <div className="text-sm text-white/50">
                To receive incentives and fees create a lock and vote with it.
              </div>
            </div>
          )}

          {/* Lock rows */}
          {locks.map((lock) => (
            <div
              key={lock.tokenId.toString()}
              className="rounded-xl bg-[#0d1f1a]/80 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors overflow-hidden"
            >
              {/* Main row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                {/* Left: Icon + ID + actions */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0a1612] border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/assets/Logo.svg"
                      alt="MEGA"
                      width={28}
                      height={28}
                      className="w-7 h-7"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      Lock #{lock.tokenId.toString()}
                      <span className="text-white/40 text-xs">🔒</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {(
                        ["increase", "extend", "merge", "transfer"] as const
                      ).map((action) => (
                        <Link
                          key={action}
                          href={`/lock/${lock.tokenId.toString()}?manage=${action}`}
                          className="text-xs text-[#f7931a] hover:text-[#ff9f2a] capitalize transition-colors"
                        >
                          {action.charAt(0).toUpperCase() + action.slice(1)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-right">
                  <div>
                    <div className="text-xs text-white/40 mb-1">Rebase APR</div>
                    <div className="text-sm font-semibold text-green-400">
                      {lock.rebaseApr ?? "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">
                      Locked Amount
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {formatAmount(lock.lockedAmount, 4)}{" "}
                      <span className="text-white/60">MEGA</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">
                      Voting Power
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {formatAmount(lock.votingPower, 4)}{" "}
                      <span className="text-white/60">veMEGA</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">
                      Unlock Date
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        lock.isExpired ? "text-red-400" : "text-white"
                      }`}
                      title={lock.unlockDate.toString()}
                    >
                      {lock.isExpired
                        ? "Expired"
                        : `locked for ${formatDuration(lock.remainingWeeks)}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Relays Section */}
    </div>
  );
}
