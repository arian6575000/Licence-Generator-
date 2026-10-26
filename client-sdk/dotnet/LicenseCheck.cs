// License check for .NET desktop apps (WinForms / WPF / console), Windows.
// Format: MPOS-LIC-<base64url payload>.<base64url ed25519 signature>   (same as RetailX License Hub)
// NuGet: BouncyCastle.Cryptography
using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

public static class LicenseCheck
{
    // ====== CHANGE THESE PER APP ======
    const string ProjectCode = "myapp";
    const string PublicKeyHex = "PASTE_PUBLIC_KEY_HEX_FROM_GENERATOR_KEYS_TAB";
    // ==================================
    const string Prefix = "MPOS-LIC-";

    static readonly string Dir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), ProjectCode);
    static string LicFile => Path.Combine(Dir, "license.key");
    static string SeenFile => Path.Combine(Dir, "license.seen");

    static byte[] B64Url(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        s += new string('=', (4 - s.Length % 4) % 4);
        return Convert.FromBase64String(s);
    }

    /// Replace with your own hardware id if you already have one (RetailX style).
    public static string GetMachineId()
    {
        string guid = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography", "MachineGuid", "")?.ToString() ?? "";
        string cpu = Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER") ?? "";
        string arch = System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString().ToLowerInvariant();
        var hex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("MPOS-DEVID-v1|win|" + guid + "|" + cpu + "|" + arch)));
        return string.Join("-", Enumerable.Range(0, 5).Select(i => hex.Substring(i * 4, 4)));
    }

    public record Result(bool Ok, string Reason, int? DaysLeft, JsonElement? Payload);

    public static bool Can(Result r, string feature) =>
        r.Ok && r.Payload!.Value.GetProperty("features").TryGetProperty(feature, out var v) && v.ValueKind == JsonValueKind.True;

    public static Result Verify(string license)
    {
        try
        {
            var key = license.Trim();
            if (!key.StartsWith(Prefix)) return new(false, "format", null, null);
            var p = key.Substring(Prefix.Length).Split('.');
            if (p.Length != 2) return new(false, "format", null, null);
            var body = B64Url(p[0]);
            var sig = B64Url(p[1]);

            var v = new Ed25519Signer();
            v.Init(false, new Ed25519PublicKeyParameters(Convert.FromHexString(PublicKeyHex), 0));
            v.BlockUpdate(body, 0, body.Length);
            if (!v.VerifySignature(sig)) return new(false, "signature", null, null);

            var doc = JsonDocument.Parse(body);
            var root = doc.RootElement.Clone();
            if (root.TryGetProperty("project_code", out var pc) && pc.GetString() != ProjectCode) return new(false, "project", null, null);
            if (!string.Equals(root.GetProperty("machine_id").GetString()?.Trim(), GetMachineId(), StringComparison.OrdinalIgnoreCase))
                return new(false, "machine", null, null);

            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            long last = File.Exists(SeenFile) && long.TryParse(File.ReadAllText(SeenFile), out var l) ? l : 0;
            if (last != 0 && now + 300000 < last) return new(false, "clock", null, null);

            int? daysLeft = null;
            if (!root.GetProperty("is_lifetime").GetBoolean())
            {
                var end = DateTimeOffset.Parse(root.GetProperty("expiry_date").GetString()!.Substring(0, 10) + "T23:59:59Z").ToUnixTimeMilliseconds();
                if (now > end) return new(false, "expired", null, null);
                daysLeft = (int)Math.Max(0, Math.Ceiling((end - now) / 86400000.0));
            }
            Directory.CreateDirectory(Dir);
            File.WriteAllText(SeenFile, Math.Max(now, last).ToString());
            return new(true, "", daysLeft, root);
        }
        catch { return new(false, "format", null, null); }
    }

    public static Result Activate(string license)
    {
        var r = Verify(license);
        if (r.Ok) { Directory.CreateDirectory(Dir); File.WriteAllText(LicFile, license.Trim()); }
        return r;
    }

    public static Result CheckSaved() =>
        File.Exists(LicFile) ? Verify(File.ReadAllText(LicFile)) : new(false, "format", null, null);
}
