"""
Configuration module for Whale Surveillance Dashboard.
Safe trading defaults: live trading disabled by default, dry_run enforced.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Whale Surveillance Dashboard"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./whale_audit.db"
    
    # Safe defaults
    trading_mode: str = Field(default="dry_run", description="dry_run | simulation | live. Live requires explicit override.")
    live_trading_enabled: bool = False
    require_approval_gate: bool = True

    # Security & Tokens (No hard-coded production secrets)
    operator_token: str = Field(default="dev-operator-token-change-in-prod", description="Required for sensitive operator actions")
    readonly_token: str = Field(default="dev-readonly-token", description="Viewer token")
    
    # Risk Limits
    max_position_size_sol: float = 5.0
    max_total_exposure_sol: float = 50.0
    daily_loss_limit_sol: float = 10.0
    max_slippage_bps: int = 150
    circuit_breaker_max_consecutive_failures: int = 3
    quote_freshness_ttl_seconds: int = 15
    valuation_freshness_ttl_seconds: int = 30

    # RPC & External Providers
    solana_rpc_url: str = "https://api.mainnet-beta.solana.com"
    jupiter_api_url: str = "https://quote-api.jup.ag/v6"
    dexscreener_api_url: str = "https://api.dexscreener.com/latest/dex"
    rugcheck_api_url: str = "https://api.rugcheck.xyz/v1"
    signer_service_url: str = "http://localhost:9000"


settings = Settings()
