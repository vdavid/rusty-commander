package main

import (
	"fmt"
	"os/exec"
	"strings"
)

// PrettierCheck checks code formatting with Prettier.
type PrettierCheck struct{}

func (c *PrettierCheck) Name() string {
	return "Prettier"
}

func (c *PrettierCheck) Run(ctx *CheckContext) error {
	// Check from project root (Svelte project is at root level)
	checkCmd := exec.Command("pnpm", "format:check")
	checkCmd.Dir = ctx.RootDir
	output, err := runCommand(checkCmd, true)

	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))

		if !ctx.CI {
			// Auto-fix
			formatCmd := exec.Command("pnpm", "format")
			formatCmd.Dir = ctx.RootDir
			formatCmd.Stdout = nil
			formatCmd.Stderr = nil
			if formatErr := formatCmd.Run(); formatErr != nil {
				return fmt.Errorf("failed to run pnpm format: %w", formatErr)
			}
			// Re-check
			recheckCmd := exec.Command("pnpm", "format:check")
			recheckCmd.Dir = ctx.RootDir
			if _, recheckErr := runCommand(recheckCmd, true); recheckErr == nil {
				return nil // Fixed
			}
		}
		return fmt.Errorf("prettier check failed")
	}
	return nil
}

// ESLintCheck checks code with ESLint.
type ESLintCheck struct{}

func (c *ESLintCheck) Name() string {
	return "ESLint"
}

func (c *ESLintCheck) Run(ctx *CheckContext) error {
	checkCmd := exec.Command("pnpm", "lint")
	checkCmd.Dir = ctx.RootDir
	output, err := runCommand(checkCmd, true)

	if err != nil {
		if strings.TrimSpace(output) != "" {
			fmt.Println()
			fmt.Print(indentOutput(output, "      "))
		} else {
			fmt.Println()
			fmt.Println("    ESLint found errors. Run: pnpm lint")
		}

		if !ctx.CI {
			// Auto-fix
			fixCmd := exec.Command("pnpm", "lint:fix")
			fixCmd.Dir = ctx.RootDir
			fixCmd.Stdout = nil
			fixCmd.Stderr = nil
			if fixErr := fixCmd.Run(); fixErr != nil {
				return fmt.Errorf("failed to run pnpm lint:fix: %w", fixErr)
			}
			// Re-check
			recheckCmd := exec.Command("pnpm", "lint")
			recheckCmd.Dir = ctx.RootDir
			if _, recheckErr := runCommand(recheckCmd, true); recheckErr == nil {
				return nil // Fixed
			}
		}
		return fmt.Errorf("eslint check failed")
	}
	return nil
}

// SvelteTestsCheck runs Svelte unit tests with Vitest.
type SvelteTestsCheck struct{}

func (c *SvelteTestsCheck) Name() string {
	return "tests"
}

func (c *SvelteTestsCheck) Run(ctx *CheckContext) error {
	cmd := exec.Command("pnpm", "test")
	cmd.Dir = ctx.RootDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("svelte tests failed")
	}
	return nil
}

// E2ETestsCheck runs end-to-end tests with Playwright.
type E2ETestsCheck struct{}

func (c *E2ETestsCheck) Name() string {
	return "E2E tests"
}

func (c *E2ETestsCheck) Run(ctx *CheckContext) error {
	cmd := exec.Command("pnpm", "test:e2e")
	cmd.Dir = ctx.RootDir
	output, err := runCommand(cmd, true)
	if err != nil {
		fmt.Println()
		fmt.Print(indentOutput(output, "      "))
		return fmt.Errorf("e2e tests failed")
	}
	return nil
}
