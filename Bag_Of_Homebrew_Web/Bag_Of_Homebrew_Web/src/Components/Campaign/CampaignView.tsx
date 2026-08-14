import { useCallback, useEffect, useState } from 'react';
import { CampaignVaultTab } from './CampaignVaultTab';
import { CharacterSheetPage } from '../CharacterSheet/CharacterSheetPage';
import { type ApiItem} from '../../api/item';

const API_BASE = 'https://localhost:7238';

interface Member {
  userId: string;
  userName: string;
  characterId: string | null;
  characterName: string | null;
  portraitUrl: string | null;
  role: string;
  isGm: boolean;
}

interface CampaignInfo {
  id: string;
  name: string;
  inviteCode: string;
  vaultId: string;
  isGm: boolean;
}

type Tab = { kind: 'vault' } | { kind: 'player'; userId: string };

interface Props {
  campaignId: string;
  currentUserId: string;
}

interface IncomingTransfer { transferId: string; fromUserId: string; item: ApiItem; }
interface OutgoingTransfer { transferId: string; itemId: string; toUserId: string; }

export function CampaignView({ campaignId, currentUserId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [tab, setTab] = useState<Tab>({ kind: 'vault' });
  const [incoming, setIncoming] = useState<IncomingTransfer[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingTransfer[]>([]);

  const loadMembers = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/members`, { credentials: 'include' });
    if (res.ok) setMembers(await res.json());
  }, [campaignId]);

  const loadCampaign = useCallback(async () => {
    // reuse the campaigns list to find this one's info
    const res = await fetch(`${API_BASE}/api/campaigns`, { credentials: 'include' });
    if (res.ok) {
      const all: CampaignInfo[] = await res.json();
      setCampaign(all.find((c) => c.id === campaignId) ?? null);
    }
  }, [campaignId]);

  const loadTransfers = useCallback(async () => {
    const [inc, out] = await Promise.all([
      fetch(`${API_BASE}/api/campaigns/${campaignId}/transfers/incoming`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/campaigns/${campaignId}/transfers/outgoing`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
    ]);
    setIncoming(inc);
    setOutgoing(out);
  }, [campaignId]);

  useEffect(() => { loadMembers(); loadCampaign(); loadTransfers();}, [loadMembers, loadCampaign, loadTransfers]);

  const isGm = campaign?.isGm ?? false;
  const players = members.filter((m) => !m.isGm);

  return (
    <div className="campaign-view">
      <div className="campaign-view__header">
        <h1 className="campaign-view__title">{campaign?.name ?? 'Campaign'}</h1>
        {isGm && campaign && (
          <span className="campaign-view__code">Invite code: <strong>{campaign.inviteCode}</strong></span>
        )}
      </div>

      <div className="campaign-tabs">
        <button
          className={`campaign-tabs__tab ${tab.kind === 'vault' ? 'campaign-tabs__tab--active' : ''}`}
          onClick={() => setTab({ kind: 'vault' })}
        >
          🐉 Campaign Vault
        </button>
        {players.map((p) => (
            <button
                key={p.userId}
                className={`campaign-tabs__tab ${
                tab.kind === 'player' && tab.userId === p.userId ? 'campaign-tabs__tab--active' : ''
                } ${p.userId === currentUserId ? 'campaign-tabs__tab--you' : ''}`}
                onClick={() => setTab({ kind: 'player', userId: p.userId })}
            >
                {p.characterName ?? p.userName}
            </button>
        ))}
      </div>

      <div className="campaign-view__body">
        <div className="campaign-view__body">
            <div className="campaign-view__body">
            {tab.kind === 'vault' ? (
                <CampaignVaultTab campaignId={campaignId} isGm={isGm} players={players.filter((p) => p.characterId)}/>
            ) : (() => {
                const player = players.find((p) => p.userId === tab.userId);
                if (!player?.characterId) return <p className="campaign-view__placeholder">No character.</p>;

                const isYou = tab.userId === currentUserId;
                return (
                <CharacterSheetPage
                  key={player.characterId}
                  characterId={player.characterId}
                  vaultId=""
                  campaign={{
                    campaignId,
                    campaignVaultId: campaign!.vaultId,
                    memberUserId: isYou ? undefined : tab.userId,
                    giftTargets: players
                      .filter((p) => p.userId !== currentUserId && p.characterId)  // other players with characters
                      .map((p) => ({ userId: p.userId, name: p.characterName ?? p.userName })),
                    incoming,
                    outgoing,
                    onTransfersChanged: loadTransfers,
                  }}
                  readOnly={!isYou}
                />
                );
            })()}
            </div>
        </div>
      </div>
    </div>
  );
}