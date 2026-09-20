namespace Bag_Of_Homebrew_API.Dtos;

public record EquipRequest(Guid ItemId, string SlotType, bool TwoHanded = false);
public record UnequipRequest(string SlotType);
public record SetPortraitRequest(string? PortraitUrl);
public record SetSheetRequest(string? PdfSheetUrl);
public record SetAcRequest(string? ManualAc);
public record CreateCharacterRequest(string Name);
public record UpdateHealthRequest(int? CurrentHp, int? MaxHp, int? TempHp);
public record UpdateCurrencyRequest(int Platinum, int Gold, int Electrum, int Silver, int Copper);
