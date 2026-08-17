import { useCallback, useEffect, useState } from 'react';
import { CampaignVaultTab } from './CampaignVaultTab';
import { CharacterSheetPage } from '../CharacterSheet/CharacterSheetPage';
import { type ApiItem} from '../../api/item';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE } from '../../config';

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
  const [incoming, setIncoming] = useState<IncomingTransfer[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingTransfer[]>([]);
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();


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

  const playerUserId = params.userId;
  const isPlayerTab = location.pathname.includes('/player/');
  const activeTab: Tab = isPlayerTab && playerUserId
    ? { kind: 'player', userId: playerUserId }
    : { kind: 'vault' };

  const goToVault = () => navigate(`/campaign/${campaignId}/vault`);
  const goToPlayer = (userId: string) => navigate(`/campaign/${campaignId}/player/${userId}`);

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
          className={`campaign-tabs__tab ${activeTab.kind === 'vault' ? 'campaign-tabs__tab--active' : ''}`}
          onClick={goToVault}
        >
          🐉 Campaign Vault
        </button>
        {players.map((p) => (
            <button
                key={p.userId}
                className={`campaign-tabs__tab ${
                activeTab.kind === 'player' && activeTab.userId === p.userId ? 'campaign-tabs__tab--active' : ''
                } ${p.userId === currentUserId ? 'campaign-tabs__tab--you' : ''}`}
                onClick={() => goToPlayer(p.userId)}
            >
                {p.characterName ?? p.userName}
            </button>
        ))}
      </div>

      <div className="campaign-view__body">
        <div className="campaign-view__body">
            <div className="campaign-view__body">
            {activeTab.kind === 'vault' ? (
                <CampaignVaultTab campaignId={campaignId} isGm={isGm} players={players.filter((p) => p.characterId)}/>
            ) : (() => {
                const player = players.find((p) => p.userId === activeTab.userId);
                if (!player?.characterId) return <p className="campaign-view__placeholder">No character.</p>;

                const isYou = activeTab.userId === currentUserId;
                return (
                <CharacterSheetPage
                  key={player.characterId}
                  characterId={player.characterId}
                  vaultId=""
                  campaign={{
                    campaignId,
                    campaignVaultId: campaign!.vaultId,
                    memberUserId: isYou ? undefined : activeTab.userId,
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