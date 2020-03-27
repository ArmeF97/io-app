import { fromNullable, none, some } from "fp-ts/lib/Option";
import { AmountInEuroCents, RptId } from "italia-pagopa-commons/lib/pagopa";
import * as pot from "italia-ts-commons/lib/pot";
import { ActionSheet, Content, Text, View } from "native-base";
import * as React from "react";
import { StyleSheet } from "react-native";
import { NavigationInjectedProps } from "react-navigation";
import { connect } from "react-redux";
import { ImportoEuroCents } from "../../../../definitions/backend/ImportoEuroCents";
import { PaymentRequestsGetResponse } from "../../../../definitions/backend/PaymentRequestsGetResponse";
import ButtonDefaultOpacity from "../../../components/ButtonDefaultOpacity";
import { withErrorModal } from "../../../components/helpers/withErrorModal";
import { withLightModalContext } from "../../../components/helpers/withLightModalContext";
import { withLoadingSpinner } from "../../../components/helpers/withLoadingSpinner";
import BaseScreenComponent from "../../../components/screens/BaseScreenComponent";
import TouchableDefaultOpacity from "../../../components/TouchableDefaultOpacity";
import IconFont from "../../../components/ui/IconFont";
import { LightModalContextInterface } from "../../../components/ui/LightModal";
import CardComponent from "../../../components/wallet/card/CardComponent";
import PaymentBannerComponent from "../../../components/wallet/PaymentBannerComponent";
import I18n from "../../../i18n";
import { identificationRequest } from "../../../store/actions/identification";
import {
  navigateToPaymentPickPaymentMethodScreen,
  navigateToPaymentPickPspScreen,
  navigateToTransactionDetailsScreen
} from "../../../store/actions/navigation";
import { Dispatch } from "../../../store/actions/types";
import {
  backToEntrypointPayment,
  paymentCompletedFailure,
  paymentCompletedSuccess,
  paymentExecutePayment,
  paymentInitializeState,
  runDeleteActivePaymentSaga
} from "../../../store/actions/wallet/payment";
import {
  fetchTransactionsRequest,
  runPollTransactionSaga
} from "../../../store/actions/wallet/transactions";
import { GlobalState } from "../../../store/reducers/types";
import variables from "../../../theme/variables";
import customVariables from "../../../theme/variables";
import {
  isCompletedTransaction,
  isSuccessTransaction,
  Psp,
  Transaction,
  Wallet
} from "../../../types/pagopa";
import { showToast } from "../../../utils/showToast";

type NavigationParams = Readonly<{
  rptId: RptId;
  initialAmount: AmountInEuroCents;
  verifica: PaymentRequestsGetResponse;
  idPayment: string;
  wallet: Wallet;
  psps: ReadonlyArray<Psp>;
}>;

type OwnProps = NavigationInjectedProps<NavigationParams>;

type Props = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps> &
  LightModalContextInterface &
  OwnProps;

const styles = StyleSheet.create({
  child: {
    flex: 1,
    alignContent: "center"
  },

  childTwice: {
    flex: 2,
    alignContent: "center"
  },

  parent: {
    flexDirection: "row"
  },

  paddedLR: {
    paddingLeft: variables.contentPadding,
    paddingRight: variables.contentPadding
  },

  textRight: {
    textAlign: "right"
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: variables.brandGray
  },

  textCenter: {
    textAlign: "center"
  }
});

class ConfirmPaymentMethodScreen extends React.Component<Props, never> {
  public render(): React.ReactNode {
    const verifica: PaymentRequestsGetResponse = this.props.navigation.getParam(
      "verifica"
    );

    const wallet: Wallet = this.props.navigation.getParam("wallet");

    const paymentReason = verifica.causaleVersamento;

    const fee = fromNullable(wallet.psp).fold(
      undefined,
      psp => psp.fixedCost.amount
    );

    return (
      <BaseScreenComponent
        goBack={this.props.onCancel}
        headerTitle={I18n.t("wallet.ConfirmPayment.header")}
      >
        <Content noPadded={true} bounces={false}>
          <PaymentBannerComponent
            currentAmount={verifica.importoSingoloVersamento}
            paymentReason={paymentReason}
            fee={fee as ImportoEuroCents}
          />
          <View style={{ paddingHorizontal: customVariables.contentPadding }}>
            <CardComponent
              type={"Full"}
              wallet={wallet}
              hideMenu={true}
              hideFavoriteIcon={true}
              showPsp={true}
            />
            <View spacer={true} />
            {wallet.psp === undefined ? (
              <Text>{I18n.t("payment.noPsp")}</Text>
            ) : (
              <Text>
                {I18n.t("payment.currentPsp")}
                <Text bold={true}>{` ${wallet.psp.businessName}`}</Text>
              </Text>
            )}
            <TouchableDefaultOpacity onPress={this.props.pickPsp}>
              <Text link={true} bold={true}>
                {I18n.t("payment.changePsp")}
              </Text>
            </TouchableDefaultOpacity>
          </View>
          <View spacer={true} large={true} />
        </Content>

        <View
          style={{
            backgroundColor: customVariables.alertColor,
            paddingHorizontal: customVariables.contentPadding,
            paddingVertical: 11,
            flexDirection: "row"
          }}
        >
          <IconFont
            style={{ alignSelf: "center", paddingRight: 18 }}
            name={"io-notice"}
            size={24}
            color={customVariables.colorWhite}
          />
          <Text white={true} style={{ flex: 1 }}>
            <Text bold={true} white={true}>
              {I18n.t("global.genericAlert")}
            </Text>
            {` ${I18n.t("wallet.ConfirmPayment.info")}`}
          </Text>
        </View>

        <View footer={true}>
          <ButtonDefaultOpacity
            block={true}
            primary={true}
            onPress={() => this.props.runAuthorizationAndPayment()}
          >
            <Text>{I18n.t("wallet.ConfirmPayment.goToPay")}</Text>
          </ButtonDefaultOpacity>
          <View spacer={true} />
          <View style={styles.parent}>
            <ButtonDefaultOpacity
              style={styles.child}
              block={true}
              cancel={true}
              onPress={this.props.onCancel}
            >
              <Text>{I18n.t("global.buttons.cancel")}</Text>
            </ButtonDefaultOpacity>
            <View hspacer={true} />
            <ButtonDefaultOpacity
              style={styles.childTwice}
              block={true}
              bordered={true}
              onPress={() => this.props.pickPaymentMethod()}
            >
              <Text>{I18n.t("wallet.ConfirmPayment.change")}</Text>
            </ButtonDefaultOpacity>
          </View>
        </View>
      </BaseScreenComponent>
    );
  }
}

const mapStateToProps = ({ wallet }: GlobalState) => ({
  isLoading:
    pot.isLoading(wallet.payment.transaction) ||
    pot.isLoading(wallet.payment.confirmedTransaction),
  error: pot.isError(wallet.payment.transaction)
    ? some(wallet.payment.transaction.error.message)
    : none
});

const mapDispatchToProps = (dispatch: Dispatch, props: OwnProps) => {
  const onTransactionTimeout = () => {
    dispatch(backToEntrypointPayment());
    showToast(I18n.t("wallet.ConfirmPayment.transactionTimeout"), "warning");
  };

  const onTransactionValid = (tx: Transaction) => {
    if (isSuccessTransaction(tx)) {
      // on success:
      dispatch(
        navigateToTransactionDetailsScreen({
          isPaymentCompletedTransaction: true,
          transaction: tx
        })
      );
      // signal success
      dispatch(
        paymentCompletedSuccess({
          transaction: tx,
          rptId: props.navigation.getParam("rptId"),
          kind: "COMPLETED"
        })
      );
      // reset the payment state
      dispatch(paymentInitializeState());
      // update the transactions state
      dispatch(fetchTransactionsRequest());
      // navigate to the resulting transaction details
      showToast(I18n.t("wallet.ConfirmPayment.transactionSuccess"), "success");
    } else {
      // on failure:
      // navigate to entrypoint of payment or wallet home
      dispatch(backToEntrypointPayment());
      // signal faliure
      dispatch(paymentCompletedFailure());
      // delete the active payment from pagoPA
      dispatch(runDeleteActivePaymentSaga());
      // reset the payment state
      dispatch(paymentInitializeState());
      showToast(I18n.t("wallet.ConfirmPayment.transactionFailure"), "danger");
    }
  };

  const onIdentificationSuccess = () => {
    dispatch(
      paymentExecutePayment.request({
        wallet: props.navigation.getParam("wallet"),
        idPayment: props.navigation.getParam("idPayment"),
        onSuccess: action => {
          dispatch(
            runPollTransactionSaga({
              id: action.payload.id,
              isValid: isCompletedTransaction,
              onTimeout: onTransactionTimeout,
              onValid: onTransactionValid
            })
          );
        }
      })
    );
  };

  const runAuthorizationAndPayment = () =>
    dispatch(
      identificationRequest(
        false,
        {
          message: I18n.t("wallet.ConfirmPayment.identificationMessage")
        },
        {
          label: I18n.t("wallet.ConfirmPayment.cancelPayment"),
          onCancel: () => undefined
        },
        {
          onSuccess: onIdentificationSuccess
        }
      )
    );
  return {
    pickPaymentMethod: () =>
      dispatch(
        navigateToPaymentPickPaymentMethodScreen({
          rptId: props.navigation.getParam("rptId"),
          initialAmount: props.navigation.getParam("initialAmount"),
          verifica: props.navigation.getParam("verifica"),
          idPayment: props.navigation.getParam("idPayment")
        })
      ),
    pickPsp: () =>
      dispatch(
        navigateToPaymentPickPspScreen({
          rptId: props.navigation.getParam("rptId"),
          initialAmount: props.navigation.getParam("initialAmount"),
          verifica: props.navigation.getParam("verifica"),
          idPayment: props.navigation.getParam("idPayment"),
          psps: props.navigation.getParam("psps"),
          wallet: props.navigation.getParam("wallet")
        })
      ),
    onCancel: () => {
      ActionSheet.show(
        {
          options: [
            I18n.t("wallet.ConfirmPayment.confirmCancelPayment"),
            I18n.t("wallet.ConfirmPayment.confirmContinuePayment")
          ],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          title: I18n.t("wallet.ConfirmPayment.confirmCancelTitle")
        },
        buttonIndex => {
          if (buttonIndex === 0) {
            // on cancel:
            // navigate to entrypoint of payment or wallet home
            dispatch(backToEntrypointPayment());
            // delete the active payment from pagoPA
            dispatch(runDeleteActivePaymentSaga());
            // reset the payment state
            dispatch(paymentInitializeState());
            showToast(
              I18n.t("wallet.ConfirmPayment.cancelPaymentSuccess"),
              "success"
            );
          }
        }
      );
    },
    runAuthorizationAndPayment,
    onRetry: runAuthorizationAndPayment
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(
  withLightModalContext(
    withErrorModal(
      withLoadingSpinner(ConfirmPaymentMethodScreen),
      (_: string) => _
    )
  )
);
