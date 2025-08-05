export type CurrencyInfo = {
    readonly id: string
    readonly name: string
    readonly defaultDerivationPath: string
    readonly svgLogoUrl: string
    readonly symbol: string
    readonly minimalUnitSymbol: string
    readonly decimals: number
    readonly commonDerivationPaths: readonly string[]
    readonly nativeTokenId: string
    readonly nativeTokenName: string
}

export type EvmCurrencyInfo = CurrencyInfo & {
    readonly chainId: number
    readonly supportsEIP1559: boolean
}
