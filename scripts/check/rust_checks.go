package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
)

// RustfmtCheck formats Rust code.
type RustfmtCheck struct{}

func (c *RustfmtCheck) Name() string {
	return "rustfmt"
}

func (c *RustfmtCheck) Run(ctx *CheckContext) error {
	rustDir := filepath.Join(ctx.RootDir, "src-tauri")
	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("cargo", "fmt", "--check")
	} else {
		cmd = exec.Command("cargo", "fmt")
	}
	cmd.Dir = rustDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		if ctx.CI {
			return fmt.Errorf("code is not formatted, run cargo fmt locally")
		}
		return fmt.Errorf("rust formatting failed")
	}
	return nil
}

// ClippyCheck runs Clippy linter with auto-fix.
type ClippyCheck struct{}

func (c *ClippyCheck) Name() string {
	return "clippy"
}

func (c *ClippyCheck) Run(ctx *CheckContext) error {
	rustDir := filepath.Join(ctx.RootDir, "src-tauri")
	var cmd *exec.Cmd
	if ctx.CI {
		cmd = exec.Command("cargo", "clippy", "--", "-D", "warnings")
	} else {
		cmd = exec.Command("cargo", "clippy", "--fix", "--allow-dirty", "--allow-staged", "--", "-D", "warnings")
	}
	cmd.Dir = rustDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		if ctx.CI {
			return fmt.Errorf("clippy errors found, run the check script locally")
		}
		return fmt.Errorf("clippy found unfixable issues")
	}
	return nil
}

// CargoAuditCheck checks for security vulnerabilities.
type CargoAuditCheck struct{}

func (c *CargoAuditCheck) Name() string {
	return "cargo-audit"
}

func (c *CargoAuditCheck) Run(ctx *CheckContext) error {
	rustDir := filepath.Join(ctx.RootDir, "src-tauri")

	// Check if cargo-audit is installed
	if !commandExists("cargo-audit") {
		fmt.Printf("%sInstalling cargo-audit...%s ", colorYellow, colorReset)
		installCmd := exec.Command("cargo", "install", "cargo-audit")
		if _, err := runCommand(installCmd, true); err != nil {
			return fmt.Errorf("failed to install cargo-audit: %w", err)
		}
	}

	cmd := exec.Command("cargo", "audit")
	cmd.Dir = rustDir
	output, err := runCommand(cmd, true)
	if err != nil {
		// Check if it's just informational (no vulnerabilities found)
		if strings.Contains(output, "0 vulnerabilities found") {
			return nil
		}
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("security vulnerabilities found")
	}
	return nil
}

// CargoDenyCheck enforces license and dependency policies.
type CargoDenyCheck struct{}

func (c *CargoDenyCheck) Name() string {
	return "cargo-deny"
}

func (c *CargoDenyCheck) Run(ctx *CheckContext) error {
	rustDir := filepath.Join(ctx.RootDir, "src-tauri")

	// Check if deny.toml exists
	denyToml := filepath.Join(rustDir, "deny.toml")
	if _, err := exec.Command("test", "-f", denyToml).Output(); err != nil {
		// No deny.toml, skip
		fmt.Printf("%sSKIPPED%s (no deny.toml)\n", colorYellow, colorReset)
		return nil
	}

	// Check if cargo-deny is installed
	if !commandExists("cargo-deny") {
		fmt.Printf("%sInstalling cargo-deny...%s ", colorYellow, colorReset)
		installCmd := exec.Command("cargo", "install", "cargo-deny")
		if _, err := runCommand(installCmd, true); err != nil {
			return fmt.Errorf("failed to install cargo-deny: %w", err)
		}
	}

	cmd := exec.Command("cargo", "deny", "check", "licenses", "bans", "sources")
	cmd.Dir = rustDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("cargo-deny check failed")
	}
	return nil
}

// RustTestsCheck runs Rust tests.
type RustTestsCheck struct{}

func (c *RustTestsCheck) Name() string {
	return "tests"
}

func (c *RustTestsCheck) Run(ctx *CheckContext) error {
	rustDir := filepath.Join(ctx.RootDir, "src-tauri")
	cmd := exec.Command("cargo", "test")
	cmd.Dir = rustDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("rust tests failed")
	}
	return nil
}
